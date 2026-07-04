import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createReadStream, existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

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

async function polishWithModel(input) {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  const typeName = input.type === 'business' ? '商机发现' : '人性发现';
  const outputName =
    input.draftType === 'speech' ? '口播稿' : input.draftType === 'research' ? '详细研究文档' : '行动清单';
  const tags = Array.isArray(input.tags) && input.tags.length > 0 ? input.tags.join('、') : '无';

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      input: [
        {
          role: 'system',
          content:
            '你是一名中文商业内容编辑。保留用户原始洞察，不编造事实，把零散记录扩写成结构完整、细节充分、表达自然的成稿。',
        },
        {
          role: 'user',
          content: `类型：${typeName}\n输出形式：${outputName}\n标签：${tags}\n标题：${input.title}\n原始记录：${input.content}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Model request failed: ${response.status}`);
  }

  const data = await response.json();
  return data.output_text || data.output?.flatMap((item) => item.content || []).map((part) => part.text || '').join('');
}

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'POST' && req.url === '/api/polish') {
      const body = await readJson(req);
      const generated = await polishWithModel(body);
      if (!generated) {
        sendJson(res, 503, { error: 'OPENAI_API_KEY is not configured' });
        return;
      }
      sendJson(res, 200, { generated });
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
