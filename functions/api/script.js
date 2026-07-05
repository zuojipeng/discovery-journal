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
    const { entry } = await context.request.json();
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
              '你是一名中文短视频口播编导。基于用户的原始发现、研究报告和讨论记录，生成一份适合真人口播的完整稿。语言自然、有个人思考感，不要像论文。',
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

请生成 900-1300 字中文口播稿，结构包括：
1. 3 秒开场钩子
2. 我观察到的现象
3. 研究后发现的关键背景
4. 我的判断
5. 普通人/创业者能怎么验证
6. 结尾互动问题

要求：保留用户自己的口吻，不要说“根据研究报告”，不要空泛喊口号。`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return Response.json({ error: `Model request failed: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    return Response.json({ script: extractText(data) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
