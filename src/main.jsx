import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AlarmClock,
  Archive,
  Bell,
  BookOpenText,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  FileText,
  Lightbulb,
  Mic2,
  Sparkles,
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
    draftType: 'speech',
    generated: '',
  },
];

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

function generateDraft(entry) {
  const topic = entry.type === 'business' ? '商机发现' : '人性发现';
  const style =
    entry.draftType === 'speech'
      ? '口播稿'
      : entry.draftType === 'research'
        ? '研究文档'
        : '行动清单';

  if (!entry.content.trim()) return '';

  const intro =
    entry.draftType === 'speech'
      ? `大家好，今天想和你分享一个关于「${topic}」的观察。`
      : `# ${entry.title || topic}\n\n## 核心观察`;
  const body =
    entry.draftType === 'speech'
      ? `\n\n我的原始记录是：${entry.content.trim()}\n\n这件事值得展开，是因为它不只是一个表面现象，而是暴露出需求、动机和行为之间的连接。第一，用户已经表现出明确的场景需求；第二，现有解决方案还有摩擦；第三，如果把这个发现产品化，就可以形成更稳定的价值交换。\n\n如果要继续验证，我会从三个问题开始：谁最痛、他们现在怎么解决、他们愿意为什么付费。只要这三个问题能被真实答案支撑，这个发现就不只是灵感，而可能成为一个可以推进的机会。`
      : `\n\n${entry.content.trim()}\n\n## 深度拆解\n\n1. 背景：这个发现来自真实场景中的行为、表达或交易信号，需要优先保留原始语境。\n2. 关键洞察：表面现象背后存在一个更稳定的动机结构，可能是效率、信任、身份、利益或安全感。\n3. 可验证假设：如果这个洞察成立，类似人群在相近场景中会重复出现同类选择。\n4. 下一步：设计一次小规模验证，记录对象、触发点、反馈和转化行为。\n\n## 可执行结论\n\n把今天的发现整理成一个待验证假设，并在未来 3 天内寻找至少 5 个相似样本。`;

  return `${style}\n\n${intro}${body}`;
}

function App() {
  const [entries, setEntries] = useState(() => loadState()?.entries || defaultEntries);
  const [reminder, setReminder] = useState(() => loadState()?.reminder || '21:30');
  const [notificationStatus, setNotificationStatus] = useState(() =>
    typeof Notification === 'undefined' ? 'unsupported' : Notification.permission,
  );
  const [isGenerating, setIsGenerating] = useState(false);
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
    return {
      total: entries.length,
      todayDone: entries.some((entry) => new Date(entry.date).toDateString() === today && countText(entry.content) >= 200),
      words: entries.reduce((sum, entry) => sum + countText(entry.content), 0),
    };
  }, [entries]);

  function createEntry(type) {
    const entry = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      type,
      title: type === 'business' ? '新的商机发现' : '新的人性发现',
      content: '',
      draftType: 'speech',
      generated: '',
    };
    setEntries((current) => [entry, ...current]);
    setActiveId(entry.id);
  }

  function updateEntry(id, patch) {
    setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
  }

  async function polishWithAi() {
    if (!activeEntry) return;
    setIsGenerating(true);
    try {
      const response = await fetch('/api/polish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(activeEntry),
      });
      if (!response.ok) throw new Error('AI service unavailable');
      const data = await response.json();
      updateEntry(activeEntry.id, { generated: data.generated || generateDraft(activeEntry) });
    } catch {
      updateEntry(activeEntry.id, { generated: generateDraft(activeEntry) });
    } finally {
      setIsGenerating(false);
    }
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
              placeholder="记录现象、人物、对话、交易信号或反常识细节。先写真实素材，再让 AI 整理成稿。"
            />

            <div className="progress-row">
              <div className="progress-track">
                <span style={{ width: `${progress}%` }} />
              </div>
              <strong>{count}/200</strong>
            </div>

            <div className="section-title compact">
              <Sparkles size={18} />
              <h2>生成方式</h2>
            </div>
            <div className="draft-tabs">
              {[
                ['speech', Mic2, '口播稿'],
                ['research', BookOpenText, '研究文档'],
                ['action', CheckCircle2, '行动清单'],
              ].map(([value, Icon, label]) => (
                <button
                  key={value}
                  className={activeEntry.draftType === value ? 'active' : ''}
                  onClick={() => updateEntry(activeEntry.id, { draftType: value })}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            <button className="ai-button" onClick={polishWithAi} disabled={count < 200 || isGenerating}>
              <Sparkles size={19} />
              {isGenerating ? 'AI 生成中' : 'AI 完善成文稿'}
              <ChevronRight size={18} />
            </button>

            {count < 200 && <p className="hint">还差 {remaining} 字，达到门槛后可生成完整文稿。</p>}

            {activeEntry.generated && (
              <article className="generated">
                <div>
                  <FileText size={18} />
                  <strong>AI 生成稿</strong>
                </div>
                <pre>{activeEntry.generated}</pre>
              </article>
            )}
          </section>
        )}

        <section className="history">
          <div className="section-title">
            <Lightbulb size={18} />
            <h2>发现库</h2>
            <button className="ghost-icon" aria-label="归档">
              <Archive size={18} />
            </button>
          </div>
          {entries.map((entry) => (
            <button
              key={entry.id}
              className={entry.id === activeId ? 'history-item active' : 'history-item'}
              onClick={() => setActiveId(entry.id)}
            >
              <span>{entry.title || '未命名发现'}</span>
              <small>{countText(entry.content)} 字</small>
            </button>
          ))}
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
