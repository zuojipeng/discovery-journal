import { polishWithModel } from '../../lib/ai.mjs';

export async function onRequestPost(context) {
  try {
    const input = await context.request.json();
    const result = await polishWithModel(input, context.env);

    if (!result) {
      return Response.json({ error: 'AI provider API key is not configured' }, { status: 503 });
    }

    return Response.json({
      generated: result.text,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
