import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlarmClock,
  Archive,
  Bell,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  Eye,
  FileText,
  Globe2,
  Lightbulb,
  MessageCircle,
  Search,
  Send,
  Tags,
  UserRoundSearch,
} from 'lucide-react';
import './styles.css';

const STORAGE_KEY = 'daily-discovery-v1';

const defaultEntries = [
  {
    id: 'sample-business',
    date: new Date().toISOString(),
    type: 'business',
    title: '线下门店的私域复购机会',
    content:
      '今天观察到一家社区咖啡店把新品试喝和会员群结合起来，用户在店内扫码后会收到第二天的限时复购券。这个动作不复杂，但把到店体验、微信群运营和复购激励连在了一起。真正的商机可能不在咖啡本身，而在帮助小店主把一次性客流转成可持续触达的关系资产。很多小店并不缺产品，也不缺短期促销，真正缺的是把顾客重新带回来的低成本机制。如果能做一个轻量工具，自动生成活动话术、优惠节奏和复购提醒，再结合店员执行清单，就可能切入大量社区门店。',
    research: '',
    researchSources: [],
    researchMeta: {},
    discussion: [],
    speechScript: '',
    tags: ['社区门店', '私域复购'],
    publish: {
      status: 'draft',
      views: '',
      likes: '',
      comments: '',
      saves: '',
      notes: '',
    },
  },
];

function normalizeEntry(entry) {
  return {
    ...entry,
    tags: Array.isArray(entry.tags) ? entry.tags : [],
    research: entry.research || '',
    researchSources: Array.isArray(entry.researchSources) ? entry.researchSources : [],
    researchMeta: entry.researchMeta || {},
    discussion: Array.isArray(entry.discussion) ? entry.discussion : [],
    speechScript: entry.speechScript || entry.generated || '',
    publish: {
      status: entry.publish?.status || 'draft',
      views: entry.publish?.views || '',
      likes: entry.publish?.likes || '',
      comments: entry.publish?.comments || '',
      saves: entry.publish?.saves || '',
      notes: entry.publish?.notes || '',
    },
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function countText(text) {
  return text.trim().replace(/\s+/g, '').length;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  }).format(new Date(date));
}

function generateResearchFallback(entry) {
  const topic = entry.type === 'business' ? '商机发现' : '人性发现';

  if (!entry.content.trim()) return '';

  return `# ${entry.title || topic}

> 当前是本地兜底版本：尚未调用 AI 研究接口。配置 AI 模型 Key 和搜索 Key 后，系统会生成带来源的研究报告。

## 你的原始发现

${entry.content.trim()}

## 初步判断

这个发现值得研究，因为它指向一个正在变大的问题：当 AI Agent 从“信息助手”进入“交易、决策、身份、资金操作”场景后，信任、安全、授权和追责会成为基础设施级问题。

## 需要继续调研的方向

1. Agent 身份与授权：谁有权让 Agent 代表用户行动。
2. 操作留痕与责任追溯：当 Agent 出错、被攻击或被诱导时，责任如何确认。
3. 资金与隐私风险：支付、订票、购物、企业工作流会放大安全问题。
4. 区块链或可验证凭证是否适合解决身份与审计问题。

## 可验证假设

如果个人和企业开始把真实交易交给 Agent，那么“Agent 身份、权限、审计、保险、风控”可能形成一个新的基础设施市场。`;
}

function generateScriptFallback(entry) {
  const research = entry.research || generateResearchFallback(entry);
  return `大家好，今天想聊一个我最近观察到的商机：${entry.title || 'AI Agent 的可信问题'}。

我原本只是想到，未来 Agent 可能会帮我们订机票、买饭、记账、网购，甚至帮企业自动处理工作流。但越想越觉得这里有一个很大的问题：如果这个 Agent 被攻击、被诱导，或者被别人操控了，损失到底算谁的？

这背后其实不是一个简单的安全问题，而是一个未来基础设施问题。因为 Agent 一旦开始代表人行动，它就需要身份、授权、留痕、追责。否则它越强，风险越大。

我看到的机会是：未来可能会出现一类专门服务 AI Agent 的信任系统。它可能包括 Agent 身份绑定、权限管理、操作审计、资金风控，甚至保险机制。区块链、可验证凭证、企业权限系统，都有可能参与进来。

所以今天这个发现给我的启发是：AI Agent 真正大规模普及之前，最先被需要的未必是更聪明的 Agent，而是让人敢把事情交给 Agent 的信任基础设施。

如果你也在做 AI Agent，或者正在研究自动化工作流，可以思考一个问题：你的 Agent 做错事以后，谁知道它为什么错，谁能证明它被谁指挥，谁来承担后果？

这可能就是下一个很大的商机。`;
}

function generateDiscussionFallback(question) {
  return `我会从三个角度继续拆：第一，这个问题是否真实高频；第二，谁最先愿意为安全和追责付费；第三，现有方案为什么不够。你刚才问的是「${question}」，我建议把它落到一个具体场景里，比如“企业 Agent 自动付款前需要什么审批和留痕”。`;
}

function App() {
  const [entries, setEntries] = useState(() => (loadState()?.entries || defaultEntries).map(normalizeEntry));
  const [reminder, setReminder] = useState(() => loadState()?.reminder || '21:30');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [discussionInput, setDiscussionInput] = useState('');
  const [notificationStatus, setNotificationStatus] = useState(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const [busyAction, setBusyAction] = useState('');
  const [activeId, setActiveId] = useState(() => entries[0]?.id || 'today');
  const activeEntry = entries.find((entry) => entry.id === activeId) || entries[0];

  useEffect(() => {
    saveState({ entries, reminder });
  }, [entries, reminder]);

  useEffect(() => {
    if (notificationStatus !== 'granted') return undefined;
    const [hour, minute] = reminder.split(':').map(Number);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return undefined;

    const now = new Date();
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);

    const timer = window.setTimeout(() => {
      new Notification('今日发现', {
        body: '写下今天的商机发现或人性发现。',
      });
    }, next.getTime() - now.getTime());

    return () => window.clearTimeout(timer);
  }, [notificationStatus, reminder]);

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const published = entries.filter((entry) => entry.publish?.status === 'published').length;
    return {
      total: entries.length,
      todayDone: entries.some((entry) => new Date(entry.date).toDateString() === today && countText(entry.content) >= 200),
      words: entries.reduce((sum, entry) => sum + countText(entry.content), 0),
      published,
    };
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();
    return entries.filter((entry) => {
      const typeMatched = typeFilter === 'all' || entry.type === typeFilter || entry.publish?.status === typeFilter;
      const text = [entry.title, entry.content, entry.research, entry.speechScript, ...(entry.tags || [])].join(' ').toLowerCase();
      return typeMatched && (!keyword || text.includes(keyword));
    });
  }, [entries, searchTerm, typeFilter]);

  function createEntry(type) {
    const entry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      type,
      title: type === 'business' ? '新的商机发现' : '新的人性发现',
      content: '',
      research: '',
      researchSources: [],
      researchMeta: {},
      discussion: [],
      speechScript: '',
      tags: [],
      publish: {
        status: 'draft',
        views: '',
        likes: '',
        comments: '',
        saves: '',
        notes: '',
      },
    };
    setEntries((current) => [entry, ...current]);
    setActiveId(entry.id);
  }

  function updateEntry(id, patch) {
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  function updatePublish(id, patch) {
    updateEntry(id, {
      publish: {
        ...(entries.find((entry) => entry.id === id)?.publish || {}),
        ...patch,
      },
    });
  }

  function updateTags(id, value) {
    updateEntry(id, {
      tags: value
        .split(/[，,\s]+/)
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 8),
    });
  }

  async function callAi(endpoint, fallback, payload = {}) {
    if (!activeEntry) return;
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          entry: activeEntry,
          ...payload,
        }),
      });
      if (!response.ok) throw new Error('AI service unavailable');
      return await response.json();
    } catch {
      return fallback();
    }
  }

  async function researchWithAi() {
    if (!activeEntry) return;
    setBusyAction('research');
    const data = await callAi('/api/research', () => ({
      research: generateResearchFallback(activeEntry),
      sources: [],
      mode: 'local_fallback',
      notice: '当前是本地兜底版本，没有调用 AI 模型或搜索接口。',
      provider: 'local',
      model: 'fallback',
    }));
    updateEntry(activeEntry.id, {
      research: data.research || generateResearchFallback(activeEntry),
      researchSources: data.sources || [],
      researchMeta: {
        mode: data.mode || 'model_only',
        notice: data.notice || '',
        provider: data.provider || '',
        model: data.model || '',
      },
    });
    setBusyAction('');
  }

  async function discussWithAi() {
    if (!activeEntry || !discussionInput.trim()) return;
    const question = discussionInput.trim();
    const nextDiscussion = [...(activeEntry.discussion || []), { role: 'user', content: question }];
    updateEntry(activeEntry.id, { discussion: nextDiscussion });
    setDiscussionInput('');
    setBusyAction('discuss');
    const data = await callAi('/api/discuss', () => ({
      answer: generateDiscussionFallback(question),
    }), { question, discussion: nextDiscussion });
    updateEntry(activeEntry.id, {
      discussion: [...nextDiscussion, { role: 'assistant', content: data.answer || generateDiscussionFallback(question) }],
    });
    setBusyAction('');
  }

  async function generateSpeechScript() {
    if (!activeEntry) return;
    setBusyAction('script');
    const data = await callAi('/api/script', () => ({
      script: generateScriptFallback(activeEntry),
    }));
    updateEntry(activeEntry.id, {
      speechScript: data.script || generateScriptFallback(activeEntry),
    });
    setBusyAction('');
  }

  async function enableReminder() {
    if (!('Notification' in window)) return;
    const permission = await Notification.requestPermission();
    setNotificationStatus(permission);
    if (permission === 'granted') {
      new Notification('今日发现', {
        body: `已设置每天 ${reminder} 提醒。`,
      });
    }
  }

  const count = activeEntry ? countText(activeEntry.content) : 0;
  const progress = Math.min(100, Math.round((count / 200) * 100));
  const remaining = Math.max(0, 200 - count);
  const reminderLabel = notificationStatus === 'granted' ? '通知已开' : notificationStatus === 'unsupported' ? '不支持' : '开启通知';

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="app-header">
          <div>
            <p className="kicker">Daily Discovery</p>
            <h1>今日发现</h1>
            <p className="subtitle">把每天看到的商机和人性信号，沉淀成可复用的判断材料。</p>
          </div>
          <div className={stats.todayDone ? 'status-badge done' : 'status-badge'}>
            <CheckCircle2 size={17} />
            {stats.todayDone ? '今日已完成' : '今日待完成'}
          </div>
        </header>

        <div className="workspace-grid">
          <aside className="side-panel">
            <section className="mission-panel">
              <div className="mission-copy">
                <span>{formatDate(new Date())}</span>
                <strong>{remaining === 0 ? '今天的素材已经够生成文稿。' : `还差 ${remaining} 字，完成今日发现。`}</strong>
              </div>
              <div className="mission-progress" aria-label={`完成进度 ${progress}%`}>
                <span style={{ width: `${progress}%` }} />
              </div>
            </section>

            <section className="control-strip">
              <div className="reminder">
                <div className="reminder-copy">
                  <AlarmClock size={18} />
                  <span>每日提醒</span>
                </div>
                <div className="reminder-control">
                  <input
                    value={reminder}
                    inputMode="numeric"
                    pattern="[0-9]{2}:[0-9]{2}"
                    onChange={(event) => setReminder(event.target.value)}
                    aria-label="提醒时间"
                  />
                  <button onClick={enableReminder} aria-label="开启通知提醒">
                    <Bell size={17} />
                    {reminderLabel}
                  </button>
                </div>
              </div>

              <div className="stats-row">
                <div>
                  <span>记录</span>
                  <strong>{stats.total}</strong>
                </div>
                <div>
                  <span>字数</span>
                  <strong>{stats.words}</strong>
                </div>
                <div>
                  <span>已发</span>
                  <strong>{stats.published}</strong>
                </div>
              </div>
            </section>

            <section className="quick-actions" aria-label="新建发现">
              <button className="business-action" onClick={() => createEntry('business')}>
                <BriefcaseBusiness size={18} />
                <span>商机发现</span>
              </button>
              <button className="human-action" onClick={() => createEntry('human')}>
                <UserRoundSearch size={18} />
                <span>人性发现</span>
              </button>
            </section>
          </aside>

          <section className="writing-column">
            {activeEntry && (
              <section className="editor">
                <div className="entry-type">
                  <span className={activeEntry.type === 'business' ? 'pill business' : 'pill human'}>
                    {activeEntry.type === 'business' ? <BriefcaseBusiness size={15} /> : <UserRoundSearch size={15} />}
                    {activeEntry.type === 'business' ? '商机' : '人性'}
                  </span>
                  <span>{formatDate(activeEntry.date)}</span>
                </div>

                <label className="field-label" htmlFor="entry-title">标题</label>
                <input
                  id="entry-title"
                  className="title-input"
                  value={activeEntry.title}
                  onChange={(event) => updateEntry(activeEntry.id, { title: event.target.value })}
                  placeholder="给今天的发现起个标题"
                />

                <label className="field-label" htmlFor="entry-content">原始发现</label>
                <textarea
                  id="entry-content"
                  value={activeEntry.content}
                  onChange={(event) => updateEntry(activeEntry.id, { content: event.target.value })}
                  placeholder="记录现象、人物、对话、交易信号或反常识细节。先写真实素材，再整理成可复用的判断材料。"
                />

                <label className="field-label" htmlFor="entry-tags">标签</label>
                <div className="tag-input-wrap">
                  <Tags size={17} />
                  <input
                    id="entry-tags"
                    value={(activeEntry.tags || []).join('，')}
                    onChange={(event) => updateTags(activeEntry.id, event.target.value)}
                    placeholder="行业、人群、场景、动机，逗号分隔"
                  />
                </div>

                <div className="progress-row">
                  <div className="progress-track">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <strong>{count}/200</strong>
                </div>

                <div className="section-title compact">
                  <Globe2 size={18} />
                  <h2>研究流程</h2>
                </div>

                <button className="ai-button" onClick={researchWithAi} disabled={count < 200 || busyAction === 'research'}>
                  <Globe2 size={19} />
                  {busyAction === 'research' ? '正在研究' : '开始深度研究'}
                  <ChevronRight size={18} />
                </button>

                {count < 200 && <p className="hint">还差 {remaining} 字，达到门槛后可开始研究。</p>}
                <p className="hint">先让 AI 基于你的发现做调研和判断，再在右侧讨论，最后生成口播稿。</p>
              </section>
            )}
          </section>

          <aside className="insight-panel">
            <section className="research-panel">
              <div className="section-title">
                <Globe2 size={18} />
                <h2>研究与讨论</h2>
              </div>
              {activeEntry?.research ? (
                <>
                  <div className="research-meta">
                    <span className={activeEntry.researchMeta?.mode === 'web_researched' ? 'verified' : 'caution'}>
                      {activeEntry.researchMeta?.mode === 'web_researched' ? '已联网研究' : '未确认联网'}
                    </span>
                    {(activeEntry.researchMeta?.provider || activeEntry.researchMeta?.model) && (
                      <small>
                        {[activeEntry.researchMeta?.provider, activeEntry.researchMeta?.model].filter(Boolean).join(' / ')}
                      </small>
                    )}
                  </div>
                  {activeEntry.researchMeta?.notice && <p className="research-notice">{activeEntry.researchMeta.notice}</p>}
                  <article className="research-report">
                    <pre>{activeEntry.research}</pre>
                    {(activeEntry.researchSources || []).length > 0 && (
                      <div className="source-list">
                        <strong>参考来源</strong>
                        {activeEntry.researchSources.slice(0, 6).map((source, index) => (
                          <a key={`${source.url}-${index}`} href={source.url} target="_blank" rel="noreferrer">
                            {source.title || source.url}
                          </a>
                        ))}
                      </div>
                    )}
                  </article>
                </>
              ) : (
                <section className="empty-generated">
                  <Globe2 size={22} />
                  <strong>研究报告会显示在这里</strong>
                  <span>写满 200 字后，点击左侧“开始深度研究”。</span>
                </section>
              )}

              <div className="discussion-box">
                <div className="discussion-list">
                  {(activeEntry?.discussion || []).length === 0 ? (
                    <p className="empty-list">研究完成后，可以继续追问：这个机会谁会买单？怎么验证？风险在哪里？</p>
                  ) : (
                    activeEntry.discussion.map((message, index) => (
                      <div key={index} className={`message ${message.role}`}>
                        <span>{message.role === 'user' ? '我' : 'AI'}</span>
                        <p>{message.content}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="discussion-input">
                  <input
                    value={discussionInput}
                    onChange={(event) => setDiscussionInput(event.target.value)}
                    placeholder="继续追问或补充你的判断"
                  />
                  <button onClick={discussWithAi} disabled={!discussionInput.trim() || busyAction === 'discuss'}>
                    <Send size={16} />
                  </button>
                </div>
              </div>

              <button
                className="ai-button secondary"
                onClick={generateSpeechScript}
                disabled={!activeEntry?.research || busyAction === 'script'}
              >
                <FileText size={18} />
                {busyAction === 'script' ? '正在生成口播稿' : '基于研究和讨论生成口播稿'}
                <ChevronRight size={18} />
              </button>

              {activeEntry?.speechScript && (
                <article className="generated">
                  <div>
                    <FileText size={18} />
                    <strong>口播稿</strong>
                  </div>
                  <pre>{activeEntry.speechScript}</pre>
                </article>
              )}
            </section>

            <section className="history">
              <div className="section-title">
                <Lightbulb size={18} />
                <h2>发现库</h2>
                <button className="ghost-icon" aria-label="归档">
                  <Archive size={18} />
                </button>
              </div>
              <div className="library-tools">
                <label className="search-box">
                  <Search size={16} />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="搜索标题、正文、标签"
                  />
                </label>
                <div className="filter-tabs" aria-label="发现库筛选">
                  {[
                    ['all', '全部'],
                    ['business', '商机'],
                    ['human', '人性'],
                    ['published', '已发布'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      className={typeFilter === value ? 'active' : ''}
                      onClick={() => setTypeFilter(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {filteredEntries.map((entry) => (
                <button
                  key={entry.id}
                  className={entry.id === activeId ? 'history-item active' : 'history-item'}
                  onClick={() => setActiveId(entry.id)}
                >
                  <span>{entry.title || '未命名发现'}</span>
                  <small>{entry.publish?.status === 'published' ? '已发布' : `${countText(entry.content)} 字`}</small>
                  {(entry.tags || []).length > 0 && <em>{entry.tags.slice(0, 3).join(' / ')}</em>}
                </button>
              ))}
              {filteredEntries.length === 0 && <p className="empty-list">没有匹配的发现。</p>}
            </section>

            {activeEntry && (
              <section className="publish-panel">
                <div className="section-title">
                  <Eye size={18} />
                  <h2>发布反馈</h2>
                </div>
                <div className="publish-status" aria-label="发布状态">
                  {[
                    ['draft', '未发布'],
                    ['published', '已发布'],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      className={activeEntry.publish?.status === value ? 'active' : ''}
                      onClick={() => updatePublish(activeEntry.id, { status: value })}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="metrics-grid">
                  {[
                    ['views', '播放'],
                    ['likes', '点赞'],
                    ['comments', '评论'],
                    ['saves', '收藏'],
                  ].map(([key, label]) => (
                    <label key={key}>
                      <span>{label}</span>
                      <input
                        value={activeEntry.publish?.[key] || ''}
                        inputMode="numeric"
                        onChange={(event) => updatePublish(activeEntry.id, { [key]: event.target.value })}
                        placeholder="0"
                      />
                    </label>
                  ))}
                </div>
                <label className="feedback-note">
                  <span><MessageCircle size={15} /> 反馈记录</span>
                  <textarea
                    value={activeEntry.publish?.notes || ''}
                    onChange={(event) => updatePublish(activeEntry.id, { notes: event.target.value })}
                    placeholder="记录评论区、私信、选题反馈，方便 7 天后复盘。"
                  />
                </label>
              </section>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
