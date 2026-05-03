const https = require('https');

const CF_ACCOUNT = '304c227c3868c2cd96c3d6a840b7ef13';
const CF_TOKEN = process.env.CF_API_TOKEN;
const LS_KEY = process.env.LS_API_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;

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
    return { orders, revenue: Math.round(revenue * 100) / 100 };
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
    const stats = { updated: new Date().toISOString(), cloudflare: {}, lemonsqueezy: {}, adsense: {} };

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

    for (const days of [1, 7, 30, 90, fyDays()]) {
        if (CF_TOKEN) {
            const cfDays = Math.min(days, 90);
            try {
                stats.cloudflare[days + 'd'] = await fetchCF(cfDays);
            } catch (e) {
                console.error('CF ' + days + 'd error:', e.message);
                stats.cloudflare[days + 'd'] = { error: e.message };
            }
        }
        if (LS_KEY) {
            try {
                stats.lemonsqueezy[days + 'd'] = await fetchLS(days);
            } catch (e) {
                console.error('LS ' + days + 'd error:', e.message);
                stats.lemonsqueezy[days + 'd'] = { error: e.message };
            }
        }
        if (googleToken && adSenseAccount) {
            try {
                stats.adsense[days + 'd'] = await fetchAdSense(days, googleToken, adSenseAccount);
            } catch (e) {
                console.error('AdSense ' + days + 'd error:', e.message);
                stats.adsense[days + 'd'] = { error: e.message };
            }
        }
    }

    const fs = require('fs');
    fs.writeFileSync('_data/stats.json', JSON.stringify(stats, null, 2) + '\n');
    console.log('Stats written:', JSON.stringify(stats, null, 2));
}

main().catch(function(e) { console.error(e); process.exit(1); });
