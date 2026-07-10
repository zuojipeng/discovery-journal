const PROVIDERS = {
  openai: {
    keyNames: ['OPENAI_API_KEY'],
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4.1-mini',
    transport: 'responses',
  },
  qwen: {
    keyNames: ['DASHSCOPE_API_KEY', 'QWEN_API_KEY'],
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
    transport: 'chat',
  },
  deepseek: {
    keyNames: ['DEEPSEEK_API_KEY'],
    baseUrl: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    transport: 'chat',
  },
};

function envValue(env, name) {
  return env?.[name] || process.env?.[name] || '';
}

function normalizeProvider(value) {
  const provider = String(value || 'openai').toLowerCase();
  return PROVIDERS[provider] ? provider : 'openai';
}

function getAiConfig(env) {
  const provider = normalizeProvider(envValue(env, 'AI_PROVIDER'));
  const preset = PROVIDERS[provider];
  const upper = provider.toUpperCase();
  const apiKey = [envValue(env, `${upper}_API_KEY`), ...preset.keyNames.map((name) => envValue(env, name))].find(Boolean);

  return {
    provider,
    apiKey,
    baseUrl: envValue(env, 'AI_BASE_URL') || envValue(env, `${upper}_BASE_URL`) || preset.baseUrl,
    model: envValue(env, 'AI_MODEL') || envValue(env, `${upper}_MODEL`) || preset.model,
    transport: preset.transport,
  };
}

function extractResponseText(data) {
  return (
    data.output_text ||
    data.output
      ?.flatMap((item) => item.content || [])
      .map((part) => part.text || '')
      .join('') ||
    data.choices?.[0]?.message?.content ||
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
      sources.push({ title: value.title || value.url, url: value.url, snippet: value.snippet || value.content || '' });
    }
    if (Array.isArray(value)) value.forEach(visit);
    else Object.values(value).forEach(visit);
  }

  visit(data.sources || data.output || data);
  return sources.slice(0, 10);
}

async function callResponsesApi(messages, config, { webSearch = false } = {}) {
  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/responses`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      ...(webSearch ? { tools: [{ type: 'web_search_preview' }] } : {}),
      input: messages,
    }),
  });

  if (!response.ok) {
    throw new Error(`Model request failed: ${response.status}`);
  }

  return response.json();
}

async function callChatCompletions(messages, config) {
  const response = await fetch(`${config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: config.model,
      messages,
      temperature: 0.35,
    }),
  });

  if (!response.ok) {
    throw new Error(`Model request failed: ${response.status}`);
  }

  return response.json();
}

export async function callModel(messages, options = {}) {
  const config = getAiConfig(options.env);
  if (!config.apiKey) return null;

  const canUseNativeSearch = config.provider === 'openai' && config.transport === 'responses';
  const data =
    config.transport === 'responses'
      ? await callResponsesApi(messages, config, { webSearch: options.webSearch && canUseNativeSearch })
      : await callChatCompletions(messages, config);

  return {
    text: extractResponseText(data),
    sources: extractSources(data),
    provider: config.provider,
    model: config.model,
  };
}

async function searchWithTavily(query, env) {
  const apiKey = envValue(env, 'TAVILY_API_KEY');
  if (!apiKey) return null;

  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      max_results: 6,
      search_depth: 'advanced',
      include_answer: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`Search request failed: ${response.status}`);
  }

  const data = await response.json();
  return (data.results || [])
    .filter((item) => item.url)
    .map((item) => ({
      title: item.title || item.url,
      url: item.url,
      snippet: item.content || '',
    }));
}

async function searchWithBrave(query, env) {
  const apiKey = envValue(env, 'BRAVE_SEARCH_API_KEY');
  if (!apiKey) return null;

  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', '6');

  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
      'x-subscription-token': apiKey,
    },
  });

  if (!response.ok) {
    throw new Error(`Search request failed: ${response.status}`);
  }

  const data = await response.json();
  return (data.web?.results || [])
    .filter((item) => item.url)
    .map((item) => ({
      title: item.title || item.url,
      url: item.url,
      snippet: item.description || '',
    }));
}

async function searchWeb(query, env) {
  const preferred = String(envValue(env, 'SEARCH_PROVIDER') || '').toLowerCase();
  const searchers = preferred === 'brave' ? [searchWithBrave, searchWithTavily] : [searchWithTavily, searchWithBrave];

  for (const searcher of searchers) {
    try {
      const results = await searcher(query, env);
      if (results?.length) return { sources: results.slice(0, 6), notice: '' };
    } catch (error) {
      return { sources: [], notice: error.message };
    }
  }

  return {
    sources: [],
    notice: '未配置搜索 API。国产模型会基于已有知识和你的原始发现推理，但不会声称已经联网调研。',
  };
}

function formatSourcesForPrompt(sources) {
  if (!sources.length) return '无外部搜索来源。请明确说明当前判断未基于实时搜索结果。';
  return sources
    .map((source, index) => `${index + 1}. ${source.title}\nURL: ${source.url}\n摘要: ${source.snippet || '无摘要'}`)
    .join('\n\n');
}

function entryTypeName(entry) {
  return entry?.type === 'business' ? '商机发现' : '人性发现';
}

export async function polishWithModel(input, env) {
  const typeName = entryTypeName(input);
  const outputName =
    input.draftType === 'speech' ? '口播稿' : input.draftType === 'research' ? '详细研究文档' : '行动清单';
  const tags = Array.isArray(input.tags) && input.tags.length > 0 ? input.tags.join('、') : '无';

  return callModel(
    [
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
    { env },
  );
}

export async function researchWithModel(entry, env) {
  const typeName = entryTypeName(entry);
  const tags = Array.isArray(entry.tags) && entry.tags.length > 0 ? entry.tags.join('、') : '无';
  const searchQuery = `${entry.title || ''} ${entry.content || ''}`.replace(/\s+/g, ' ').slice(0, 160);
  const search = await searchWeb(`${typeName} ${searchQuery}`, env);
  const config = getAiConfig(env);
  const useNativeSearch = config.provider === 'openai' && search.sources.length === 0;
  const sourceBlock = formatSourcesForPrompt(search.sources);

  const result = await callModel(
    [
      {
        role: 'system',
        content:
          '你是一名中文商业研究员。你必须基于用户的原始观察做真实调研和独立判断。若提供了外部来源，必须引用来源中的事实；若没有来源，必须说明没有实时搜索来源，不要伪装成已经联网。输出要适合后续与用户讨论，不要直接写口播稿。',
      },
      {
        role: 'user',
        content: `发现类型：${typeName}
标题：${entry.title || ''}
标签：${tags}
原始发现：
${entry.content || ''}

外部搜索来源：
${sourceBlock}

请输出一篇中文研究报告，结构包括：
1. 一句话判断
2. 用户原始洞察中最有价值的部分
3. 外部背景和趋势
4. 这个机会可能成立的原因
5. 关键风险和反方观点
6. 可以验证的 3 个小实验
7. 适合短视频表达的角度

要求：观点要具体、有推理、有不确定性说明。`,
      },
    ],
    { env, webSearch: useNativeSearch },
  );

  if (!result) return null;

  const sources = search.sources.length > 0 ? search.sources : result.sources;
  const mode = sources.length > 0 ? 'web_researched' : 'model_only';
  const notice =
    mode === 'web_researched'
      ? ''
      : search.notice || '当前没有可展示的外部来源，本报告是模型基于原始发现的推理版本。';

  return { ...result, sources, mode, notice };
}

export async function discussWithModel({ entry, question, discussion = [] }, env) {
  return callModel(
    [
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
    { env },
  );
}

export async function scriptWithModel(entry, env) {
  return callModel(
    [
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
    { env },
  );
}
