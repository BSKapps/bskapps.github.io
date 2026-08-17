const https = require('https');
const crypto = require('crypto');
const zlib = require('zlib');

const CF_ACCOUNT = '304c227c3868c2cd96c3d6a840b7ef13';
const CF_TOKEN = process.env.CF_API_TOKEN;
const LS_KEY = process.env.LS_API_KEY;
const APPLE_KEY_ID = process.env.APPLE_KEY_ID;
const APPLE_ISSUER_ID = process.env.APPLE_ISSUER_ID;
const APPLE_VENDOR_NUMBER = process.env.APPLE_VENDOR_NUMBER;
// Comma separated: the live vendor first, then any deprecated ones holding pre-conversion history
const APPLE_VENDORS = (APPLE_VENDOR_NUMBER || '').split(',').map(function(v) { return v.trim(); }).filter(Boolean);
const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY;

let appleDataThrough = null;

// Apple product type identifiers for app updates rather than new downloads
const APPLE_UPDATE_TYPES = ['7', '7F', '7T', 'F7'];

const BUTTONMAKER_PATH = '/buttonmaker/';
const SOURCE_PATHS = ['/quickerip/', '/labassistant/', '/fetchpuppy/', '/targettrace/', '/buttonmaker/', '/gogames/'];
const MONTHLY_SPAN = 12;

function requestRaw(options) {
    return new Promise(function(resolve, reject) {
        const req = https.request(options, function(res) {
            const chunks = [];
            res.on('data', function(chunk) { chunks.push(chunk); });
            res.on('end', function() { resolve({ status: res.statusCode, headers: res.headers, buffer: Buffer.concat(chunks) }); });
        });
        req.on('error', reject);
        req.setTimeout(20000, function() { req.destroy(new Error('request timeout')); });
        req.end();
    });
}

function generateAppleJWT() {
    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: APPLE_KEY_ID, typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ iss: APPLE_ISSUER_ID, iat: now, exp: now + 1200, aud: 'appstoreconnect-v1' })).toString('base64url');
    const signingInput = header + '.' + payload;
    const sign = crypto.createSign('SHA256');
    sign.update(signingInput);
    sign.end();
    const sig = sign.sign({ key: APPLE_PRIVATE_KEY, dsaEncoding: 'ieee-p1363' }).toString('base64url');
    return signingInput + '.' + sig;
}

async function fetchAppleReport(jwt, reportDate, frequency, vendor) {
    const params = new URLSearchParams({
        'filter[frequency]': frequency,
        'filter[reportType]': 'SALES',
        'filter[reportSubType]': 'SUMMARY',
        'filter[vendorNumber]': vendor,
        'filter[reportDate]': reportDate
    });
    const res = await requestRaw({
        hostname: 'api.appstoreconnect.apple.com',
        path: '/v1/salesReports?' + params.toString(),
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + jwt, 'Accept': 'application/a-gzip' }
    });
    const contentType = res.headers['content-type'] || '';
    if (contentType.includes('json')) {
        let detail = res.buffer.toString().slice(0, 400);
        try {
            const first = (JSON.parse(res.buffer.toString()).errors || [])[0] || {};
            detail = [first.code, first.detail || first.title].filter(Boolean).join(' ');
        } catch (e) {}
        if (res.status === 404 && /no (sales|reports?) (for|available)/i.test(detail)) {
            console.log('Apple report ' + frequency + ' ' + reportDate + ' [' + vendor + ']: no sales');
            return null;
        }
        if (res.status === 404 && /not available yet/i.test(detail)) {
            console.log('Apple report ' + frequency + ' ' + reportDate + ' [' + vendor + ']: not published yet');
            return null;
        }
        throw new Error('HTTP ' + res.status + ' [' + frequency + ' ' + reportDate + '] ' + detail);
    }
    if (res.status !== 200) throw new Error('Apple API HTTP ' + res.status + ' [' + frequency + ' ' + reportDate + ']');
    const tsv = await new Promise(function(resolve, reject) {
        zlib.gunzip(res.buffer, function(e, r) { if (e) reject(e); else resolve(r.toString('utf8')); });
    });
    const lines = tsv.split('\n').filter(function(l) { return l.trim(); });
    if (lines.length < 2) {
        console.log('Apple report ' + frequency + ' ' + reportDate + ' [' + vendor + ']: empty report');
        return { units: 0, paid_units: 0, free_units: 0, update_units: 0, proceeds_by_currency: {}, sales_by_currency: {} };
    }
    const headers = lines[0].split('\t');
    const unitsIdx = headers.indexOf('Units');
    const proceedsIdx = headers.indexOf('Developer Proceeds');
    const currencyIdx = headers.indexOf('Currency of Proceeds');
    const customerPriceIdx = headers.indexOf('Customer Price');
    const customerCurrencyIdx = headers.indexOf('Customer Currency');
    const typeIdx = headers.indexOf('Product Type Identifier');
    let units = 0;
    let paidUnits = 0;
    let freeUnits = 0;
    let updateUnits = 0;
    const byType = {};
    const proceedsByCurrency = {};
    const salesByCurrency = {};
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        const u = parseInt(cols[unitsIdx]) || 0;
        units += u;
        const proceedsCur = cols[currencyIdx] || 'USD';
        const proceeds = parseFloat(cols[proceedsIdx]) || 0;
        proceedsByCurrency[proceedsCur] = (proceedsByCurrency[proceedsCur] || 0) + proceeds;
        const salesCur = (customerCurrencyIdx >= 0 && cols[customerCurrencyIdx]) || 'USD';
        const price = (customerPriceIdx >= 0 ? parseFloat(cols[customerPriceIdx]) : 0) || 0;
        salesByCurrency[salesCur] = (salesByCurrency[salesCur] || 0) + price * u;
        const type = (typeIdx >= 0 && cols[typeIdx]) || '?';
        if (APPLE_UPDATE_TYPES.indexOf(type) >= 0) { updateUnits += u; }
        else if (price > 0) { paidUnits += u; }
        else { freeUnits += u; }
        const bucket = type + (price > 0 ? ' paid' : ' free');
        byType[bucket] = (byType[bucket] || 0) + u;
    }
    console.log('Apple report ' + frequency + ' ' + reportDate + ' [' + vendor + ']: ' + units + ' units (' + paidUnits + ' paid, ' + freeUnits + ' free, ' + updateUnits + ' updates) ' + JSON.stringify(byType));
    if (units > 0 && frequency !== 'YEARLY' && vendor === APPLE_VENDORS[0]) {
        const month = reportDate.slice(0, 7);
        if (!appleDataThrough || month > appleDataThrough) appleDataThrough = month;
    }
    return { units, paid_units: paidUnits, free_units: freeUnits, update_units: updateUnits, proceeds_by_currency: proceedsByCurrency, sales_by_currency: salesByCurrency };
}

function sumAppleReports(list) {
    return list.reduce(function(a, r) {
        const merged = Object.assign({}, a.proceeds_by_currency);
        for (const c in r.proceeds_by_currency) { merged[c] = (merged[c] || 0) + r.proceeds_by_currency[c]; }
        const mergedSales = Object.assign({}, a.sales_by_currency);
        for (const c in r.sales_by_currency) { mergedSales[c] = (mergedSales[c] || 0) + r.sales_by_currency[c]; }
        return {
            units: a.units + r.units,
            paid_units: a.paid_units + (r.paid_units || 0),
            free_units: a.free_units + (r.free_units || 0),
            update_units: a.update_units + (r.update_units || 0),
            proceeds_by_currency: merged,
            sales_by_currency: mergedSales
        };
    }, { units: 0, paid_units: 0, free_units: 0, update_units: 0, proceeds_by_currency: {}, sales_by_currency: {} });
}

// Daily windows only ever cover recent dates, so deprecated vendors cannot hold anything there
async function fetchAppleReportAllVendors(jwt, reportDate, frequency) {
    const vendors = frequency === 'DAILY' ? APPLE_VENDORS.slice(0, 1) : APPLE_VENDORS;
    const found = [];
    for (let i = 0; i < vendors.length; i++) {
        if (i === 0) {
            const r = await fetchAppleReport(jwt, reportDate, frequency, vendors[i]);
            if (r) found.push(r);
        } else {
            try {
                const r = await fetchAppleReport(jwt, reportDate, frequency, vendors[i]);
                if (r) found.push(r);
            } catch (e) {
                console.error('Apple legacy vendor ' + vendors[i] + ' ' + frequency + ' ' + reportDate + ':', e.message);
            }
        }
    }
    if (!found.length) return null;
    return sumAppleReports(found);
}

async function fetchExchangeRates() {
    const res = await request({
        hostname: 'open.er-api.com',
        path: '/v6/latest/USD',
        method: 'GET',
        headers: {}
    });
    if (res.status !== 200) throw new Error('Exchange rates HTTP ' + res.status);
    return res.body.rates;
}

async function fetchApple(rates) {
    const jwt = generateAppleJWT();
    const result = {};
    const monthlyCache = {};
    const failures = [];
    function noteFailure(label, e) {
        console.error('Apple ' + label + ':', e.message);
        if (failures.length < 5) failures.push(label + ': ' + e.message);
    }

    function dateStr(daysAgo) {
        const d = new Date(Date.now() - daysAgo * 86400000);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    }
    function monthStr(monthsAgo) {
        const now = new Date();
        const d = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
        return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    }
    function mergeCurrencies(a, b) {
        const r = Object.assign({}, a);
        for (const cur in b) { r[cur] = (r[cur] || 0) + b[cur]; }
        return r;
    }
    function toUsd(byCurrency) {
        let usd = 0;
        for (const currency in byCurrency) {
            const amount = byCurrency[currency];
            usd += currency === 'USD' ? amount : (rates && rates[currency] ? amount / rates[currency] : 0);
        }
        return Math.round(usd * 100) / 100;
    }
    function convertAmounts(r) {
        const audRate = (rates && rates['AUD']) || 1.55;
        const salesUsd = toUsd(r.sales_by_currency);
        const proceedsUsd = toUsd(r.proceeds_by_currency);
        return {
            units: r.units,
            paid_units: r.paid_units || 0,
            free_units: r.free_units || 0,
            update_units: r.update_units || 0,
            sales_usd: salesUsd,
            sales_aud: Math.round(salesUsd * audRate * 100) / 100,
            proceeds_usd: proceedsUsd,
            proceeds_aud: Math.round(proceedsUsd * audRate * 100) / 100
        };
    }
    function sumReports(reports) {
        return reports.reduce(function(a, r) {
            return {
                units: a.units + r.units,
                paid_units: a.paid_units + (r.paid_units || 0),
                free_units: a.free_units + (r.free_units || 0),
                update_units: a.update_units + (r.update_units || 0),
                proceeds_by_currency: mergeCurrencies(a.proceeds_by_currency, r.proceeds_by_currency),
                sales_by_currency: mergeCurrencies(a.sales_by_currency, r.sales_by_currency)
            };
        }, { units: 0, paid_units: 0, free_units: 0, update_units: 0, proceeds_by_currency: {}, sales_by_currency: {} });
    }
    const empty = { units: 0, paid_units: 0, free_units: 0, update_units: 0, proceeds_by_currency: {}, sales_by_currency: {} };

    // Fetch last 7 daily reports for 1d and 7d windows
    const daily = [];
    for (let i = 1; i <= 7; i++) {
        try {
            daily.push(await fetchAppleReportAllVendors(jwt, dateStr(i), 'DAILY') || empty);
        } catch (e) {
            noteFailure('daily d-' + i, e);
            daily.push(empty);
        }
    }
    result['1d'] = convertAmounts(daily[0]);
    result['7d'] = convertAmounts(sumReports(daily));

    // Fetch monthly reports for prior complete months
    async function getMonth(m) {
        if (monthlyCache[m] !== undefined) return monthlyCache[m];
        try {
            monthlyCache[m] = await fetchAppleReportAllVendors(jwt, m, 'MONTHLY') || empty;
        } catch (e) {
            noteFailure('monthly ' + m, e);
            monthlyCache[m] = empty;
        }
        return monthlyCache[m];
    }

    // Current month daily reports (supplements monthly data since current month has no monthly report yet)
    const now = new Date();
    const dayOfMonth = now.getDate();
    const currentMonthDaily = daily.slice(0, Math.min(7, dayOfMonth - 1));
    for (let i = 8; i < dayOfMonth; i++) {
        try {
            currentMonthDaily.push(await fetchAppleReportAllVendors(jwt, dateStr(i), 'DAILY') || empty);
        } catch (e) {
            noteFailure('daily d-' + i, e);
            currentMonthDaily.push(empty);
        }
    }
    const currentMonthSum = sumReports(currentMonthDaily);

    const m30 = await Promise.all([getMonth(monthStr(1)), getMonth(monthStr(2))]);
    const s30 = sumReports(m30.concat([currentMonthSum]));
    result['30d'] = convertAmounts(s30);

    const m90 = await Promise.all([getMonth(monthStr(1)), getMonth(monthStr(2)), getMonth(monthStr(3)), getMonth(monthStr(4))]);
    const s90 = sumReports(m90.concat([currentMonthSum]));
    result['90d'] = convertAmounts(s90);

    const fyStartYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    const fyMonths = [];
    for (let m = 6; m <= 17; m++) {
        const d = new Date(fyStartYear, m, 1);
        if (d > now) break;
        // skip current month — covered by currentMonthSum
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) continue;
        fyMonths.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
    }
    const fyData = await Promise.all(fyMonths.map(getMonth));
    const sfy = sumReports(fyData.concat([currentMonthSum]));
    result['fy'] = convertAmounts(sfy);

    // All time: yearly reports are kept for 10 years, daily/weekly/monthly only 1 year
    const thisYear = now.getFullYear();
    const yearly = [];
    let misses = 0;
    for (let y = thisYear - 1; y >= thisYear - 10 && misses < 2; y--) {
        let r = null;
        try {
            r = await fetchAppleReportAllVendors(jwt, String(y), 'YEARLY');
        } catch (e) {
            noteFailure('yearly ' + y, e);
            break;
        }
        // In January the just-ended year may have no yearly report yet, and a summed
        // result cannot tell which vendor is missing, so rebuild it from months either way
        if (y === thisYear - 1 && now.getMonth() === 0) {
            const priorMonths = [];
            for (let m = 0; m < 12; m++) {
                priorMonths.push(y + '-' + String(m + 1).padStart(2, '0'));
            }
            r = sumReports(await Promise.all(priorMonths.map(getMonth)));
        }
        if (r && r.units) { yearly.push(r); misses = 0; } else { misses++; }
    }
    const ytdMonths = [];
    for (let m = 0; m < now.getMonth(); m++) {
        ytdMonths.push(thisYear + '-' + String(m + 1).padStart(2, '0'));
    }
    const ytd = await Promise.all(ytdMonths.map(getMonth));
    result['all'] = convertAmounts(sumReports(yearly.concat(ytd, [currentMonthSum])));

    const seriesKeys = [];
    for (let i = MONTHLY_SPAN - 1; i >= 1; i--) seriesKeys.push(monthStr(i));
    const seriesData = await Promise.all(seriesKeys.map(getMonth));
    const monthly = {};
    seriesKeys.forEach(function(m, i) {
        const c = convertAmounts(seriesData[i]);
        monthly[m] = { sales_usd: c.sales_usd, proceeds_usd: c.proceeds_usd, units: c.units, paid_units: c.paid_units };
    });
    const cm = convertAmounts(currentMonthSum);
    monthly[monthStr(0)] = { sales_usd: cm.sales_usd, proceeds_usd: cm.proceeds_usd, units: cm.units, paid_units: cm.paid_units };
    result.monthly = monthly;

    if (failures.length) result.failures = failures;
    if (appleDataThrough) result.data_through = appleDataThrough;

    return result;
}

function monthKey(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function recentMonthKeys(span) {
    const now = new Date();
    const keys = [];
    for (let i = span - 1; i >= 0; i--) keys.push(monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1)));
    return keys;
}

function computeMonthlySales(orders, span) {
    const refundedUsd = function(o) { return (o.attributes.refunded_amount_usd || 0) / 100; };
    const isSale = function(o) {
        return o.attributes.status === 'paid' || o.attributes.status === 'partial_refund';
    };
    const isFree = function(o) {
        return ((o.attributes.total_usd || 0) - (o.attributes.tax_usd || 0)) === 0;
    };
    const buckets = {};
    recentMonthKeys(span).forEach(function(m) { buckets[m] = { month: m, net_usd: 0, paid_orders: 0, free_orders: 0 }; });
    orders.filter(isSale).forEach(function(o) {
        const m = monthKey(new Date(o.attributes.created_at));
        if (!buckets[m]) return;
        if (isFree(o)) { buckets[m].free_orders += 1; return; }
        buckets[m].paid_orders += 1;
        buckets[m].net_usd += ((o.attributes.total_usd || 0) - (o.attributes.tax_usd || 0)) / 100 - refundedUsd(o);
    });
    return recentMonthKeys(span).map(function(m) {
        buckets[m].net_usd = Math.round(buckets[m].net_usd * 100) / 100;
        return buckets[m];
    });
}

async function fetchCFMonthlyVisits(span) {
    const out = {};
    const now = new Date();
    for (let i = span - 1; i >= 0; i--) {
        const first = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const last = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const start = monthKey(first) + '-01';
        const end = (last > now ? now : last).toISOString().split('T')[0];
        const query = `{ viewer { accounts(filter: {accountTag: "${CF_ACCOUNT}"}) { rumPageloadEventsAdaptiveGroups(filter: {AND: [{date_geq: "${start}"}, {date_leq: "${end}"}]} limit: 1) { count sum { visits } } } } }`;
        const body = JSON.stringify({ query });
        try {
            const res = await request({
                hostname: 'api.cloudflare.com',
                path: '/client/v4/graphql',
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + CF_TOKEN,
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(body)
                }
            }, body);
            if (res.body.errors) throw new Error(res.body.errors[0].message);
            const g = res.body.data.viewer.accounts[0].rumPageloadEventsAdaptiveGroups[0];
            if (g) out[monthKey(first)] = { visits: g.sum.visits || 0, pageviews: g.count || 0 };
        } catch (e) {
            console.error('CF monthly ' + monthKey(first) + ' error:', e.message);
        }
    }
    return out;
}

function readPriorStats() {
    const fs = require('fs');
    const path = process.env.PRIOR_STATS_PATH;
    if (!path) return null;
    try {
        return JSON.parse(fs.readFileSync(path, 'utf8'));
    } catch (e) {
        console.log('No prior stats to merge (' + e.message + ')');
        return null;
    }
}

function request(options, body) {
    return new Promise(function(resolve, reject) {
        const req = https.request(options, function(res) {
            let data = '';
            res.on('data', function(chunk) { data += chunk; });
            res.on('end', function() {
                try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
                catch (e) { resolve({ status: res.statusCode, body: data }); }
            });
        });
        req.on('error', reject);
        req.setTimeout(20000, function() { req.destroy(new Error('request timeout')); });
        if (body) req.write(body);
        req.end();
    });
}

async function fetchCF(days) {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const query = `{ viewer { accounts(filter: {accountTag: "${CF_ACCOUNT}"}) { rumPageloadEventsAdaptiveGroups(filter: {AND: [{date_geq: "${start}"}, {date_leq: "${end}"}]} limit: 5000) { count sum { visits } } } } }`;
    const body = JSON.stringify({ query });
    const res = await request({
        hostname: 'api.cloudflare.com',
        path: '/client/v4/graphql',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + CF_TOKEN,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        }
    }, body);

    if (res.body.errors) throw new Error(res.body.errors[0].message);
    const groups = res.body.data.viewer.accounts[0].rumPageloadEventsAdaptiveGroups;
    const pageviews = groups.reduce(function(a, g) { return a + g.count; }, 0);
    const visits = groups.reduce(function(a, g) { return a + (g.sum.visits || 0); }, 0);
    return { visits, pageviews };
}

async function fetchCFPages(days) {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const query = `{ viewer { accounts(filter: {accountTag: "${CF_ACCOUNT}"}) { rumPageloadEventsAdaptiveGroups(filter: {AND: [{date_geq: "${start}"}, {date_leq: "${end}"}]} limit: 1000) { count sum { visits } dimensions { requestPath } } } } }`;
    const body = JSON.stringify({ query });
    const res = await request({
        hostname: 'api.cloudflare.com',
        path: '/client/v4/graphql',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + CF_TOKEN,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        }
    }, body);

    if (res.body.errors) throw new Error(res.body.errors[0].message);
    const groups = res.body.data.viewer.accounts[0].rumPageloadEventsAdaptiveGroups;
    return groups
        .map(function(g) { return { path: g.dimensions.requestPath, pageviews: g.count, visits: g.sum.visits || 0 }; })
        .sort(function(a, b) { return b.pageviews - a.pageviews; })
        .slice(0, 50);
}

async function fetchCFInhouse(days) {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const query = `{ viewer { accounts(filter: {accountTag: "${CF_ACCOUNT}"}) { rumPageloadEventsAdaptiveGroups(filter: {AND: [{date_geq: "${start}"}, {date_leq: "${end}"}, {refererPath: "${BUTTONMAKER_PATH}"}]} limit: 1000) { count sum { visits } dimensions { requestPath } } } } }`;
    const body = JSON.stringify({ query });
    const res = await request({
        hostname: 'api.cloudflare.com',
        path: '/client/v4/graphql',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + CF_TOKEN,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        }
    }, body);

    if (res.body.errors) throw new Error(res.body.errors[0].message);
    const groups = res.body.data.viewer.accounts[0].rumPageloadEventsAdaptiveGroups;
    const clicks = {};
    groups.forEach(function(g) {
        const dest = g.dimensions.requestPath;
        if (dest === BUTTONMAKER_PATH) return;
        clicks[dest] = (clicks[dest] || 0) + g.count;
    });
    return clicks;
}

async function fetchCFSources(days) {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const query = `{ viewer { accounts(filter: {accountTag: "${CF_ACCOUNT}"}) { rumPageloadEventsAdaptiveGroups(filter: {AND: [{date_geq: "${start}"}, {date_leq: "${end}"}]} limit: 5000) { count dimensions { requestPath refererHost } } } } }`;
    const body = JSON.stringify({ query });
    const res = await request({
        hostname: 'api.cloudflare.com',
        path: '/client/v4/graphql',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + CF_TOKEN,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        }
    }, body);

    if (res.body.errors) throw new Error(res.body.errors[0].message);
    const groups = res.body.data.viewer.accounts[0].rumPageloadEventsAdaptiveGroups;
    const byPath = {};
    groups.forEach(function(g) {
        const path = g.dimensions.requestPath;
        if (SOURCE_PATHS.indexOf(path) === -1) return;
        const host = g.dimensions.refererHost || '';
        if (!byPath[path]) byPath[path] = {};
        byPath[path][host] = (byPath[path][host] || 0) + g.count;
    });
    const out = {};
    Object.keys(byPath).forEach(function(path) {
        out[path] = Object.keys(byPath[path])
            .map(function(host) { return { host: host, count: byPath[path][host] }; })
            .sort(function(a, b) { return b.count - a.count; })
            .slice(0, 8);
    });
    return out;
}

async function fetchCFCountries(days) {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const query = `{ viewer { accounts(filter: {accountTag: "${CF_ACCOUNT}"}) { rumPageloadEventsAdaptiveGroups(filter: {AND: [{date_geq: "${start}"}, {date_leq: "${end}"}]} limit: 300) { count sum { visits } dimensions { countryName } } } } }`;
    const body = JSON.stringify({ query });
    const res = await request({
        hostname: 'api.cloudflare.com',
        path: '/client/v4/graphql',
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + CF_TOKEN,
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(body)
        }
    }, body);

    if (res.body.errors) throw new Error(res.body.errors[0].message);
    const groups = res.body.data.viewer.accounts[0].rumPageloadEventsAdaptiveGroups;
    return groups
        .map(function(g) { return { country: g.dimensions.countryName, pageviews: g.count, visits: g.sum.visits || 0 }; })
        .sort(function(a, b) { return b.visits - a.visits || b.pageviews - a.pageviews; })
        .slice(0, 12);
}

async function fetchAllOrders() {
    const orders = [];
    let page = 1;
    const maxPages = 100;
    while (page <= maxPages) {
        const res = await request({
            hostname: 'api.lemonsqueezy.com',
            path: '/v1/orders?page[size]=100&page[number]=' + page,
            method: 'GET',
            headers: {
                'Authorization': 'Bearer ' + LS_KEY,
                'Accept': 'application/vnd.api+json'
            }
        });
        if (res.status !== 200) throw new Error('LS API error: ' + res.status);
        const data = res.body.data || [];
        orders.push.apply(orders, data);
        const lastPage = res.body.meta && res.body.meta.page && res.body.meta.page.lastPage;
        if (lastPage ? page >= lastPage : data.length < 100) break;
        page++;
    }
    if (page > maxPages) console.error('LS pagination hit max ' + maxPages + ' pages; orders may be truncated');
    return orders;
}

function computeLS(orders, days) {
    const cutoff = new Date(Date.now() - days * 86400000);
    const inWindow = function(d) { return !!d && new Date(d) >= cutoff; };
    const refundedStore = function(o) { return (o.attributes.refunded_amount || 0) / 100; };
    const refundedUsd = function(o) { return (o.attributes.refunded_amount_usd || 0) / 100; };
    const isSale = function(o) {
        return o.attributes.status === 'paid' || o.attributes.status === 'partial_refund';
    };
    const wasRefunded = function(o) {
        return o.attributes.status === 'refunded' || o.attributes.status === 'partial_refund'
            || o.attributes.refunded === true || refundedUsd(o) > 0;
    };
    const recent = orders.filter(function(o) {
        return inWindow(o.attributes.created_at) && isSale(o);
    });
    const refundedRecent = orders.filter(function(o) {
        return wasRefunded(o) && inWindow(o.attributes.refunded_at || o.attributes.created_at);
    });
    const refunded_usd = refundedRecent.reduce(function(a, o) { return a + refundedUsd(o); }, 0);
    const isFree = function(o) {
        return ((o.attributes.total_usd || 0) - (o.attributes.tax_usd || 0)) === 0;
    };
    const paidRecent = recent.filter(function(o) { return !isFree(o); });
    const paidCount = paidRecent.length;
    const firstOrderId = {};
    orders.filter(function(o) { return isSale(o) || o.attributes.status === 'refunded'; })
        .sort(function(a, b) {
            return new Date(a.attributes.created_at) - new Date(b.attributes.created_at);
        }).forEach(function(o) {
            const cid = o.attributes.customer_id;
            if (cid !== undefined && cid !== null && firstOrderId[cid] === undefined) firstOrderId[cid] = o.id;
        });
    const newCustomerOrders = paidRecent.filter(function(o) {
        const cid = o.attributes.customer_id;
        if (cid === undefined || cid === null) return true;
        return firstOrderId[cid] === o.id;
    }).length;
    const ordersCount = recent.length;
    const revenue = recent.reduce(function(a, o) { return a + (o.attributes.total / 100) - refundedStore(o); }, 0);
    const net_revenue_usd = recent.reduce(function(a, o) {
        return a + ((o.attributes.total_usd - (o.attributes.tax_usd || 0)) / 100) - refundedUsd(o);
    }, 0);
    const by_product = {};
    recent.forEach(function(o) {
        const item = o.attributes.first_order_item || {};
        const name = item.product_name || 'Unknown';
        if (!by_product[name]) by_product[name] = { orders: 0, paid_orders: 0, free_orders: 0, gross_usd: 0, net_usd: 0 };
        by_product[name].orders += 1;
        if (isFree(o)) by_product[name].free_orders += 1;
        else by_product[name].paid_orders += 1;
        by_product[name].gross_usd += (o.attributes.total_usd || 0) / 100 - refundedUsd(o);
        by_product[name].net_usd += ((o.attributes.total_usd || 0) - (o.attributes.tax_usd || 0)) / 100 - refundedUsd(o);
    });
    Object.keys(by_product).forEach(function(name) {
        by_product[name].gross_usd = Math.round(by_product[name].gross_usd * 100) / 100;
        by_product[name].net_usd = Math.round(by_product[name].net_usd * 100) / 100;
    });
    return { orders: ordersCount, paid_orders: paidCount, free_orders: ordersCount - paidCount, new_customer_orders: newCustomerOrders, returning_customer_orders: paidCount - newCustomerOrders, refunds: refundedRecent.length, refunded_usd: Math.round(refunded_usd * 100) / 100, revenue: Math.round(revenue * 100) / 100, net_revenue_usd: Math.round(net_revenue_usd * 100) / 100, by_product };
}

function fyDays() {
    const now = new Date();
    const fyStart = new Date(now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1, 6, 1);
    return Math.ceil((now - fyStart) / 86400000);
}

async function main() {
    const stats = { updated: new Date().toISOString(), cloudflare: {}, pages: {}, inhouse: {}, sources: {}, countries: {}, lemonsqueezy: {}, apple: {} };

    const fyD = fyDays();
    stats.fyDays = fyD;
    const ranges = [
        { days: 1, key: '1d' },
        { days: 7, key: '7d' },
        { days: 30, key: '30d' },
        { days: 90, key: '90d' },
        { days: fyD, key: 'fy' },
        { days: 400, key: 'all' }
    ];

    let lsOrders = null, lsError = null;
    if (LS_KEY) {
        try {
            lsOrders = await fetchAllOrders();
            console.log('LS orders fetched:', lsOrders.length);
        } catch (e) {
            console.error('LS fetch error:', e.message);
            lsError = e.message;
        }
    }

    for (const { days, key } of ranges) {
        if (CF_TOKEN) {
            // Cloudflare refuses any range wider than 13w2d, so 90 days is the ceiling for every key
            const cfDays = Math.min(days, 90);
            try {
                stats.cloudflare[key] = await fetchCF(cfDays);
            } catch (e) {
                console.error('CF ' + key + ' error:', e.message);
                stats.cloudflare[key] = { error: e.message };
            }
            try {
                stats.pages[key] = await fetchCFPages(cfDays);
            } catch (e) {
                console.error('CF pages ' + key + ' error:', e.message);
                stats.pages[key] = { error: e.message };
            }
            try {
                stats.inhouse[key] = await fetchCFInhouse(cfDays);
            } catch (e) {
                console.error('CF inhouse ' + key + ' error:', e.message);
                stats.inhouse[key] = { error: e.message };
            }
            try {
                stats.sources[key] = await fetchCFSources(cfDays);
            } catch (e) {
                console.error('CF sources ' + key + ' error:', e.message);
                stats.sources[key] = { error: e.message };
            }
            try {
                stats.countries[key] = await fetchCFCountries(cfDays);
            } catch (e) {
                console.error('CF countries ' + key + ' error:', e.message);
                stats.countries[key] = { error: e.message };
            }
        }
        if (LS_KEY) {
            if (lsError) {
                stats.lemonsqueezy[key] = { error: lsError };
            } else {
                stats.lemonsqueezy[key] = computeLS(lsOrders, days);
            }
        }
    }

    if (LS_KEY) {
        stats.lemonsqueezy['all'] = lsError ? { error: lsError } : computeLS(lsOrders, 100000);
    }

    let exchangeRates = {};
    try {
        exchangeRates = await fetchExchangeRates();
        stats.exchange_rates = exchangeRates;
    } catch (e) {
        console.error('Exchange rates error:', e.message);
    }

    if (exchangeRates['AUD']) {
        for (const key of Object.keys(stats.lemonsqueezy)) {
            const ls = stats.lemonsqueezy[key];
            if (ls && ls.revenue != null) {
                ls.revenue_aud = Math.round(ls.revenue * exchangeRates['AUD'] * 100) / 100;
            }
            if (ls && ls.net_revenue_usd != null) {
                ls.net_revenue_aud = Math.round(ls.net_revenue_usd * exchangeRates['AUD'] * 100) / 100;
            }
        }
    }

    if (APPLE_KEY_ID && APPLE_ISSUER_ID && APPLE_VENDORS.length && APPLE_PRIVATE_KEY) {
        try {
            stats.apple = await fetchApple(exchangeRates);
        } catch (e) {
            console.error('Apple error:', e.message);
            for (const key of ['1d', '7d', '30d', '90d', 'fy', 'all']) {
                stats.apple[key] = { error: e.message };
            }
        }
    }

    const prior = readPriorStats();
    const priorMonthly = (prior && prior.monthly) || {};
    const appleMonthly = (stats.apple && stats.apple.monthly) || {};
    if (stats.apple && stats.apple.monthly) delete stats.apple.monthly;

    let visitsMonthly = Object.assign({}, priorMonthly.visits || {});
    if (CF_TOKEN) {
        const fetched = await fetchCFMonthlyVisits(MONTHLY_SPAN);
        visitsMonthly = Object.assign(visitsMonthly, fetched);
    }

    const salesMonthly = lsOrders ? computeMonthlySales(lsOrders, MONTHLY_SPAN) : ((priorMonthly.sales) || []);
    const appleSeries = Object.keys(appleMonthly).length ? appleMonthly : (priorMonthly.apple || {});
    stats.monthly = { span: MONTHLY_SPAN, sales: salesMonthly, apple: appleSeries, visits: visitsMonthly };

    const fs = require('fs');
    fs.writeFileSync('_data/stats.json', JSON.stringify(stats, null, 2) + '\n');
    console.log('Stats written:', JSON.stringify(stats, null, 2));
}

main().catch(function(e) { console.error(e); process.exit(1); });
