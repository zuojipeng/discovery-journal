import { researchWithModel } from '../../lib/ai.mjs';

export async function onRequestPost(context) {
  try {
    const { entry } = await context.request.json();
    const result = await researchWithModel(entry, context.env);

    if (!result) {
      return Response.json({ error: 'AI provider API key is not configured' }, { status: 503 });
    }

    return Response.json({
      research: result.text,
      sources: result.sources,
      mode: result.mode,
      notice: result.notice,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
