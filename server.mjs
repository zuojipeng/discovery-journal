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

function extractSources(data) {
  const sources = [];
  const seen = new Set();

  function visit(value) {
    if (!value || typeof value !== 'object') return;
    if (typeof value.url === 'string' && value.url.startsWith('http') && !seen.has(value.url)) {
      seen.add(value.url);
      sources.push({ title: value.title || value.url, url: value.url });
    }
    if (Array.isArray(value)) value.forEach(visit);
    else Object.values(value).forEach(visit);
  }

  visit(data.sources || data.output || data);
  return sources.slice(0, 10);
}

async function callModel(input, { webSearch = false } = {}) {
  if (!process.env.OPENAI_API_KEY) return null;

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      ...(webSearch ? { tools: [{ type: 'web_search_preview' }] } : {}),
      input,
    }),
  });

  if (!response.ok) {
    throw new Error(`Model request failed: ${response.status}`);
  }

  const data = await response.json();
  const text =
    data.output_text || data.output?.flatMap((item) => item.content || []).map((part) => part.text || '').join('') || '';
  return { text, sources: extractSources(data) };
}

async function researchWithModel(entry) {
  const typeName = entry.type === 'business' ? '商机发现' : '人性发现';
  const tags = Array.isArray(entry.tags) && entry.tags.length > 0 ? entry.tags.join('、') : '无';
  return callModel(
    [
      {
        role: 'system',
        content:
          '你是一名中文商业研究员。你必须基于用户的原始观察做真实调研和独立判断。使用联网搜索补充背景，但不要编造事实。输出要适合后续与用户讨论，不要直接写口播稿。',
      },
      {
        role: 'user',
        content: `发现类型：${typeName}
标题：${entry.title || ''}
标签：${tags}
原始发现：
${entry.content || ''}

请输出一篇真正研究过的中文研究报告，结构包括：一句话判断、原始洞察价值、外部背景和趋势、成立原因、风险和反方观点、3 个验证实验、短视频表达角度。`,
      },
    ],
    { webSearch: true },
  );
}

async function discussWithModel({ entry, question, discussion = [] }) {
  return callModel([
    {
      role: 'system',
      content: '你是用户的商业研究讨论伙伴。基于原始发现、研究报告和既有讨论继续推理。回答要具体、直接。',
    },
    {
      role: 'user',
      content: `标题：${entry.title || ''}
原始发现：
${entry.content || ''}

研究报告：
${entry.research || ''}

已有讨论：
${discussion.map((item) => `${item.role === 'user' ? '用户' : 'AI'}：${item.content}`).join('\n')}

用户新问题：
${question || ''}`,
    },
  ]);
}

async function scriptWithModel(entry) {
  return callModel([
    {
      role: 'system',
      content: '你是一名中文短视频口播编导。基于用户的原始发现、研究报告和讨论记录，生成适合真人口播的完整稿。',
    },
    {
      role: 'user',
      content: `标题：${entry.title || ''}
原始发现：
${entry.content || ''}

研究报告：
${entry.research || ''}

讨论记录：
${(entry.discussion || []).map((item) => `${item.role === 'user' ? '用户' : 'AI'}：${item.content}`).join('\n')}

请生成 900-1300 字中文口播稿，包含开场钩子、现象、研究背景、判断、验证方式、结尾互动。`,
    },
  ]);
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

    if (req.method === 'POST' && req.url === '/api/research') {
      const body = await readJson(req);
      const result = await researchWithModel(body.entry);
      if (!result) {
        sendJson(res, 503, { error: 'OPENAI_API_KEY is not configured' });
        return;
      }
      sendJson(res, 200, { research: result.text, sources: result.sources });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/discuss') {
      const body = await readJson(req);
      const result = await discussWithModel(body);
      if (!result) {
        sendJson(res, 503, { error: 'OPENAI_API_KEY is not configured' });
        return;
      }
      sendJson(res, 200, { answer: result.text });
      return;
    }

    if (req.method === 'POST' && req.url === '/api/script') {
      const body = await readJson(req);
      const result = await scriptWithModel(body.entry);
      if (!result) {
        sendJson(res, 503, { error: 'OPENAI_API_KEY is not configured' });
        return;
      }
      sendJson(res, 200, { script: result.text });
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
