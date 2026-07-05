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

export async function onRequestPost(context) {
  try {
    const { entry, question, discussion = [] } = await context.request.json();
    const apiKey = context.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 503 });
    }

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: context.env.OPENAI_MODEL || 'gpt-4.1-mini',
        input: [
          {
            role: 'system',
            content:
              '你是用户的商业研究讨论伙伴。基于原始发现、研究报告和既有讨论继续推理。回答要具体、直接，帮助用户形成更清楚的判断和短视频观点。',
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
        ],
      }),
    });

    if (!response.ok) {
      return Response.json({ error: `Model request failed: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    return Response.json({ answer: extractText(data) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
