const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

function extractBvid(input) {
  if (!input) return null;
  const match = String(input).match(/BV[0-9A-Za-z]{10}/i);
  return match ? match[0].toUpperCase() : null;
}

function normalizeUrl(input) {
  if (!input) return '';
  const trimmed = String(input).trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `https://${trimmed}`;
}

function resolveRedirect(inputUrl, limit = 5) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(inputUrl);
    const lib = urlObj.protocol === 'http:' ? http : https;
    const req = lib.request(urlObj, { method: 'GET', headers: { 'User-Agent': 'Mozilla/5.0' } }, res => {
      const status = res.statusCode || 0;
      if (status >= 300 && status < 400 && res.headers.location && limit > 0) {
        const nextUrl = new URL(res.headers.location, urlObj).toString();
        res.resume();
        resolve(resolveRedirect(nextUrl, limit - 1));
        return;
      }
      if (status >= 200 && status < 400) {
        res.resume();
        resolve(urlObj.toString());
        return;
      }
      res.resume();
      reject(new Error(`Redirect failed: ${status}`));
    });
    req.on('error', reject);
    req.end();
  });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const lib = urlObj.protocol === 'http:' ? http : https;
    const req = lib.request(urlObj, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.bilibili.com'
      }
    }, res => {
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        try {
          const text = Buffer.concat(chunks).toString('utf-8');
          resolve(JSON.parse(text));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function getBilibiliMeta(input) {
  let bvid = extractBvid(input);
  let finalUrl = input;
  if (!bvid && /b23\.tv/i.test(String(input))) {
    finalUrl = await resolveRedirect(normalizeUrl(input));
    bvid = extractBvid(finalUrl);
  }
  if (!bvid) return null;
  const apiUrl = `https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`;
  const json = await fetchJson(apiUrl);
  if (!json || json.code !== 0 || !json.data) return null;
  return {
    bvid,
    title: json.data.title || '',
    pic: json.data.pic || '',
    url: `https://www.bilibili.com/video/${bvid}`
  };
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': '*'
  });
  res.end(JSON.stringify(body));
}

function serveStatic(req, res) {
  const reqUrl = new URL(req.url, `http://${req.headers.host}`);
  let pathname = decodeURIComponent(reqUrl.pathname);
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end();
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

function createServer() {
  return http.createServer(async (req, res) => {
    const reqUrl = new URL(req.url, `http://${req.headers.host}`);
    if (reqUrl.pathname === '/api/bilibili') {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS'
        });
        res.end();
        return;
      }
      const input = reqUrl.searchParams.get('input') || '';
      if (!input) {
        sendJson(res, 400, { error: 'missing input' });
        return;
      }
      try {
        const meta = await getBilibiliMeta(input);
        if (!meta) {
          sendJson(res, 404, { error: 'not found' });
          return;
        }
        sendJson(res, 200, meta);
      } catch (_) {
        sendJson(res, 502, { error: 'upstream error' });
      }
      return;
    }
    serveStatic(req, res);
  });
}

module.exports = { extractBvid, normalizeUrl, getBilibiliMeta, createServer };

if (require.main === module) {
  const server = createServer();
  server.listen(PORT, () => {
    process.stdout.write(`http://localhost:${PORT}\n`);
  });
}
