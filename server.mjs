import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { discussWithModel, polishWithModel, researchWithModel, scriptWithModel } from './lib/ai.mjs';

const port = Number(process.env.PORT || 3100);
const distDir = join(process.cwd(), 'dist');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 100_000) {
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch (error) {
        reject(error);
      }
    });
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/polish') {
      const body = await readJson(req);
      const result = await polishWithModel(body);
      if (!result) {
        sendJson(res, 503, { error: 'AI provider API key is not configured' });
        return;
      }
      sendJson(res, 200, { generated: result.text, provider: result.provider, model: result.model });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/research') {
      const body = await readJson(req);
      const result = await researchWithModel(body.entry);
      if (!result) {
        sendJson(res, 503, { error: 'AI provider API key is not configured' });
        return;
      }
      sendJson(res, 200, {
        research: result.text,
        sources: result.sources,
        mode: result.mode,
        notice: result.notice,
        provider: result.provider,
        model: result.model,
      });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/discuss') {
      const body = await readJson(req);
      const result = await discussWithModel(body);
      if (!result) {
        sendJson(res, 503, { error: 'AI provider API key is not configured' });
        return;
      }
      sendJson(res, 200, { answer: result.text, provider: result.provider, model: result.model });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/script') {
      const body = await readJson(req);
      const result = await scriptWithModel(body.entry);
      if (!result) {
        sendJson(res, 503, { error: 'AI provider API key is not configured' });
        return;
      }
      sendJson(res, 200, { script: result.text, provider: result.provider, model: result.model });
      return;
    }

    const requested = req.url === '/' ? '/index.html' : new URL(req.url, `http://${req.headers.host}`).pathname;
    const normalized = normalize(requested).replace(/^(\.\.[/\\])+/, '');
    const filePath = join(distDir, normalized);
    const fallbackPath = join(distDir, 'index.html');
    const targetPath = existsSync(filePath) ? filePath : fallbackPath;
    const contentType = mimeTypes[extname(targetPath)] || 'application/octet-stream';
    res.writeHead(200, { 'content-type': contentType });
    createReadStream(targetPath).pipe(res);
  } catch (error) {
    sendJson(res, 500, { error: error.message });
  }
});

if (!existsSync(join(distDir, 'index.html'))) {
  await readFile(new URL('./package.json', import.meta.url), 'utf8');
  console.error('dist/index.html not found. Run npm run build first.');
  process.exit(1);
}

server.listen(port, '0.0.0.0', () => {
  console.log(`Discovery Journal is running on http://localhost:${port}`);
});
