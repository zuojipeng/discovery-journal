export async function onRequestPost(context) {
  try {
    const input = await context.request.json();
    const apiKey = context.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json({ error: 'OPENAI_API_KEY is not configured' }, { status: 503 });
    }

    const typeName = input.type === 'business' ? '商机发现' : '人性发现';
    const outputName =
      input.draftType === 'speech' ? '口播稿' : input.draftType === 'research' ? '详细研究文档' : '行动清单';

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
              '你是一名中文商业内容编辑。保留用户原始洞察，不编造事实，把零散记录扩写成结构完整、细节充分、表达自然的成稿。',
          },
          {
            role: 'user',
            content: `类型：${typeName}\n输出形式：${outputName}\n标题：${input.title || ''}\n原始记录：${input.content || ''}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return Response.json({ error: `Model request failed: ${response.status}` }, { status: 502 });
    }

    const data = await response.json();
    const generated =
      data.output_text ||
      data.output
        ?.flatMap((item) => item.content || [])
        .map((part) => part.text || '')
        .join('');

    return Response.json({ generated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
