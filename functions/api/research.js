function extractText(data) {
  return (
    data.output_text ||
    data.output
      ?.flatMap((item) => item.content || [])
      .map((part) => part.text || '')
      .join('') ||
    ''
  );
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

export async function onRequestPost(context) {
  try {
    const { entry } = await context.request.json();
    const apiKey = context.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 503 });
    }

    const typeName = entry.type === 'business' ? '商机发现' : '人性发现';
    const tags = Array.isArray(entry.tags) && entry.tags.length > 0 ? entry.tags.join('、') : '无';

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: context.env.OPENAI_MODEL || 'gpt-4.1-mini',
        tools: [{ type: 'web_search_preview' }],
        input: [
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

请输出一篇真正研究过的中文研究报告，结构包括：
1. 一句话判断
2. 用户原始洞察中最有价值的部分
3. 你联网调研后看到的外部背景和趋势
4. 这个机会可能成立的原因
5. 关键风险和反方观点
6. 可以验证的 3 个小实验
7. 适合短视频表达的角度

要求：观点要具体、有推理、有不确定性说明。`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return Response.json({ error: `Model request failed: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    return Response.json({ research: extractText(data), sources: extractSources(data) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
