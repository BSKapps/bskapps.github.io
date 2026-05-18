const https = require('https');
const crypto = require('crypto');
const zlib = require('zlib');

const CF_ACCOUNT = '304c227c3868c2cd96c3d6a840b7ef13';
const CF_TOKEN = process.env.CF_API_TOKEN;
const LS_KEY = process.env.LS_API_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const APPLE_KEY_ID = process.env.APPLE_KEY_ID;
const APPLE_ISSUER_ID = process.env.APPLE_ISSUER_ID;
const APPLE_VENDOR_NUMBER = process.env.APPLE_VENDOR_NUMBER;
const APPLE_PRIVATE_KEY = process.env.APPLE_PRIVATE_KEY;

function requestRaw(options) {
    return new Promise(function(resolve, reject) {
        const req = https.request(options, function(res) {
            const chunks = [];
            res.on('data', function(chunk) { chunks.push(chunk); });
            res.on('end', function() { resolve({ status: res.statusCode, headers: res.headers, buffer: Buffer.concat(chunks) }); });
        });
        req.on('error', reject);
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

async function fetchAppleReport(jwt, reportDate, frequency) {
    const params = new URLSearchParams({
        'filter[frequency]': frequency,
        'filter[reportType]': 'SALES',
        'filter[reportSubType]': 'SUMMARY',
        'filter[vendorNumber]': APPLE_VENDOR_NUMBER,
        'filter[reportDate]': reportDate
    });
    const res = await requestRaw({
        hostname: 'api.appstoreconnect.apple.com',
        path: '/v1/salesReports?' + params.toString(),
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + jwt, 'Accept': 'application/a-gzip' }
    });
    if (res.status === 404 || res.status === 400) return null;
    const contentType = res.headers['content-type'] || '';
    if (contentType.includes('json')) {
        const err = JSON.parse(res.buffer.toString());
        throw new Error(JSON.stringify((err.errors || [{ detail: res.status }])[0]));
    }
    if (res.status !== 200) throw new Error('Apple API HTTP ' + res.status);
    const tsv = await new Promise(function(resolve, reject) {
        zlib.gunzip(res.buffer, function(e, r) { if (e) reject(e); else resolve(r.toString('utf8')); });
    });
    const lines = tsv.split('\n').filter(function(l) { return l.trim(); });
    if (lines.length < 2) return { units: 0, proceeds_by_currency: {}, sales_by_currency: {} };
    const headers = lines[0].split('\t');
    const unitsIdx = headers.indexOf('Units');
    const proceedsIdx = headers.indexOf('Developer Proceeds');
    const currencyIdx = headers.indexOf('Currency of Proceeds');
    const customerPriceIdx = headers.indexOf('Customer Price');
    const customerCurrencyIdx = headers.indexOf('Customer Currency');
    let units = 0;
    const proceedsByCurrency = {};
    const salesByCurrency = {};
    for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split('\t');
        const u = parseInt(cols[unitsIdx]) || 0;
        units += u;
        const proceedsCur = cols[currencyIdx] || 'USD';
        const proceeds = parseFloat(cols[proceedsIdx]) || 0;
        proceedsByCurrency[proceedsCur] = Math.round(((proceedsByCurrency[proceedsCur] || 0) + proceeds) * 100) / 100;
        const salesCur = (customerCurrencyIdx >= 0 && cols[customerCurrencyIdx]) || 'USD';
        const price = (customerPriceIdx >= 0 ? parseFloat(cols[customerPriceIdx]) : 0) || 0;
        const sale = price * u;
        salesByCurrency[salesCur] = Math.round(((salesByCurrency[salesCur] || 0) + sale) * 100) / 100;
    }
    return { units, proceeds_by_currency: proceedsByCurrency, sales_by_currency: salesByCurrency };
}

async function fetchExchangeRates() {
    const res = await request({
        hostname: 'api.frankfurter.app',
        path: '/latest?from=USD',
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
        for (const cur in b) { r[cur] = Math.round(((r[cur] || 0) + b[cur]) * 100) / 100; }
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
                proceeds_by_currency: mergeCurrencies(a.proceeds_by_currency, r.proceeds_by_currency),
                sales_by_currency: mergeCurrencies(a.sales_by_currency, r.sales_by_currency)
            };
        }, { units: 0, proceeds_by_currency: {}, sales_by_currency: {} });
    }
    const empty = { units: 0, proceeds_by_currency: {}, sales_by_currency: {} };

    // Fetch last 7 daily reports for 1d and 7d windows
    const daily = [];
    for (let i = 1; i <= 7; i++) {
        try {
            daily.push(await fetchAppleReport(jwt, dateStr(i), 'DAILY') || empty);
        } catch (e) {
            console.error('Apple daily d-' + i + ':', e.message);
            daily.push(empty);
        }
    }
    result['1d'] = convertAmounts(daily[0]);
    result['7d'] = convertAmounts(sumReports(daily));

    // Fetch monthly reports for prior complete months
    async function getMonth(m) {
        if (monthlyCache[m] !== undefined) return monthlyCache[m];
        try {
            monthlyCache[m] = await fetchAppleReport(jwt, m, 'MONTHLY') || empty;
        } catch (e) {
            console.error('Apple monthly ' + m + ':', e.message);
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
            currentMonthDaily.push(await fetchAppleReport(jwt, dateStr(i), 'DAILY') || empty);
        } catch (e) {
            console.error('Apple daily d-' + i + ':', e.message);
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

    return result;
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

async function fetchLS(days) {
    const res = await request({
        hostname: 'api.lemonsqueezy.com',
        path: '/v1/orders?page[size]=100',
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + LS_KEY,
            'Accept': 'application/vnd.api+json'
        }
    });

    if (res.status !== 200) throw new Error('LS API error: ' + res.status);
    const cutoff = new Date(Date.now() - days * 86400000);
    const recent = res.body.data.filter(function(o) {
        return new Date(o.attributes.created_at) >= cutoff && o.attributes.status === 'paid';
    });
    const orders = recent.length;
    const revenue = recent.reduce(function(a, o) { return a + (o.attributes.total / 100); }, 0);
    const net_revenue_usd = recent.reduce(function(a, o) {
        const net = o.attributes.revenue_usd != null ? o.attributes.revenue_usd : o.attributes.total;
        return a + (net / 100);
    }, 0);
    return { orders, revenue: Math.round(revenue * 100) / 100, net_revenue_usd: Math.round(net_revenue_usd * 100) / 100 };
}

async function getGoogleAccessToken() {
    const body = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: GOOGLE_REFRESH_TOKEN,
        grant_type: 'refresh_token'
    }).toString();
    const res = await request({
        hostname: 'oauth2.googleapis.com',
        path: '/token',
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
    }, body);
    if (!res.body.access_token) throw new Error('Failed to get Google access token');
    return res.body.access_token;
}

async function getAdSenseAccountId(accessToken) {
    const res = await request({
        hostname: 'adsense.googleapis.com',
        path: '/v2/accounts',
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    if (res.status !== 200) throw new Error('AdSense accounts error: ' + res.status);
    const accounts = res.body.accounts || [];
    if (!accounts.length) throw new Error('No AdSense accounts found');
    return accounts[0].name;
}

async function fetchAdSense(days, accessToken, accountName) {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];
    const params = new URLSearchParams({
        'dateRange': 'CUSTOM',
        'startDate.year': start.split('-')[0],
        'startDate.month': start.split('-')[1],
        'startDate.day': start.split('-')[2],
        'endDate.year': end.split('-')[0],
        'endDate.month': end.split('-')[1],
        'endDate.day': end.split('-')[2],
        'metrics': 'ESTIMATED_EARNINGS,IMPRESSIONS,CLICKS'
    });
    const res = await request({
        hostname: 'adsense.googleapis.com',
        path: '/v2/' + accountName + '/reports:generate?' + params.toString(),
        method: 'GET',
        headers: { 'Authorization': 'Bearer ' + accessToken }
    });
    if (res.status !== 200) throw new Error('AdSense API error: ' + res.status + ' ' + JSON.stringify(res.body));
    const rows = res.body.rows || [];
    if (!rows.length) return { earnings: 0, clicks: 0 };
    const vals = rows[0].cells.map(function(c) { return parseFloat(c.value) || 0; });
    return { earnings: Math.round(vals[0] * 100) / 100, clicks: vals[2] };
}

function fyDays() {
    const now = new Date();
    const fyStart = new Date(now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1, 6, 1);
    return Math.ceil((now - fyStart) / 86400000);
}

async function main() {
    const stats = { updated: new Date().toISOString(), cloudflare: {}, lemonsqueezy: {}, adsense: {}, apple: {} };

    let googleToken = null;
    let adSenseAccount = null;
    if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET && GOOGLE_REFRESH_TOKEN) {
        try {
            googleToken = await getGoogleAccessToken();
            adSenseAccount = await getAdSenseAccountId(googleToken);
            console.log('AdSense account:', adSenseAccount);
        }
        catch (e) { console.error('Google auth error:', e.message); }
    }

    const fyD = fyDays();
    stats.fyDays = fyD;
    const ranges = [
        { days: 1, key: '1d' },
        { days: 7, key: '7d' },
        { days: 30, key: '30d' },
        { days: 90, key: '90d' },
        { days: fyD, key: 'fy' }
    ];
    for (const { days, key } of ranges) {
        if (CF_TOKEN) {
            const cfDays = Math.min(days, 90);
            try {
                stats.cloudflare[key] = await fetchCF(cfDays);
            } catch (e) {
                console.error('CF ' + key + ' error:', e.message);
                stats.cloudflare[key] = { error: e.message };
            }
        }
        if (LS_KEY) {
            try {
                stats.lemonsqueezy[key] = await fetchLS(days);
            } catch (e) {
                console.error('LS ' + key + ' error:', e.message);
                stats.lemonsqueezy[key] = { error: e.message };
            }
        }
        if (googleToken && adSenseAccount) {
            try {
                stats.adsense[key] = await fetchAdSense(days, googleToken, adSenseAccount);
            } catch (e) {
                console.error('AdSense ' + key + ' error:', e.message);
                stats.adsense[key] = { error: e.message };
            }
        }
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

    if (APPLE_KEY_ID && APPLE_ISSUER_ID && APPLE_VENDOR_NUMBER && APPLE_PRIVATE_KEY) {
        try {
            stats.apple = await fetchApple(exchangeRates);
        } catch (e) {
            console.error('Apple error:', e.message);
            for (const key of ['1d', '7d', '30d', '90d', 'fy']) {
                stats.apple[key] = { error: e.message };
            }
        }
    }

    const fs = require('fs');
    fs.writeFileSync('_data/stats.json', JSON.stringify(stats, null, 2) + '\n');
    console.log('Stats written:', JSON.stringify(stats, null, 2));
}

main().catch(function(e) { console.error(e); process.exit(1); });
