"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Thread = { id: string; title: string; updatedAt: number; messages: Message[] };

const STORAGE_KEY = "carms.workspace.v1";
const starters = [
  { icon: "⌘", title: "Build something", prompt: "Help me plan and build a new feature. Start by asking only what you need to know." },
  { icon: "⌕", title: "Find a bug", prompt: "Help me debug an issue. I'll share the relevant code and error." },
  { icon: "◇", title: "Understand code", prompt: "Explain a codebase or code snippet clearly, including how its parts fit together." },
  { icon: "↗", title: "Review an approach", prompt: "Review my technical approach. Point out risks, trade-offs, and a simpler alternative if there is one." },
];

function makeThread(): Thread {
  return { id: crypto.randomUUID(), title: "New task", updatedAt: Date.now(), messages: [] };
}

export default function Workspace() {
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState("");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const active = threads.find((thread) => thread.id === activeId);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) as Thread[] : [];
      if (Array.isArray(parsed) && parsed.length) {
        setThreads(parsed); setActiveId(parsed[0].id);
      } else {
        const first = makeThread(); setThreads([first]); setActiveId(first.id);
      }
    } catch {
      const first = makeThread(); setThreads([first]); setActiveId(first.id);
    }
    setReady(true);
  }, []);

  useEffect(() => { if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(threads)); }, [threads, ready]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [active?.messages, busy]);

  const recentThreads = useMemo(() => [...threads].sort((a, b) => b.updatedAt - a.updatedAt), [threads]);

  function newTask() {
    const thread = makeThread();
    setThreads((current) => [thread, ...current]); setActiveId(thread.id);
    setPrompt(""); setError(""); setSidebarOpen(false);
  }

  async function send(text = prompt) {
    const content = text.trim();
    if (!content || busy || !active) return;
    const outgoing: Message[] = [...active.messages, { role: "user", content }];
    setThreads((current) => current.map((thread) => thread.id === active.id ? {
      ...thread, title: thread.messages.length ? thread.title : content.slice(0, 44),
      messages: outgoing, updatedAt: Date.now(),
    } : thread));
    setPrompt(""); setError(""); setBusy(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: outgoing }),
      });
      const data = await response.json();
      if (response.status === 401) { window.location.assign("/login"); return; }
      if (!response.ok) throw new Error(data.error || "Something went wrong.");
      setThreads((current) => current.map((thread) => thread.id === active.id ? {
        ...thread, messages: [...outgoing, data.message], updatedAt: Date.now(),
      } : thread));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send your message.");
    } finally { setBusy(false); }
  }

  function onComposerKey(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    localStorage.removeItem(STORAGE_KEY);
    window.location.assign("/login");
  }

  return (
    <main className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-top">
          <a className="brand" href="/" aria-label="Carms home"><span className="brand-mark small">c<span>.</span></span><span>carms</span></a>
          <button className="icon-button mobile-close" onClick={() => setSidebarOpen(false)} aria-label="Close menu">×</button>
        </div>
        <button className="new-task" onClick={newTask}><span>＋</span> New task <kbd>⌘ K</kbd></button>
        <p className="side-label">WORKSPACE</p>
        <button className="nav-item active"><span>▦</span> All tasks</button>
        <div className="thread-heading"><span className="side-label">RECENT</span><button onClick={newTask} aria-label="New conversation">＋</button></div>
        <div className="thread-list">
          {recentThreads.map((thread) => (
            <button key={thread.id} className={`thread-item ${thread.id === activeId ? "selected" : ""}`}
              onClick={() => { setActiveId(thread.id); setSidebarOpen(false); }}>
              <span className="thread-dot">○</span><span className="thread-name">{thread.title}</span>
            </button>
          ))}
        </div>
        <div className="sidebar-bottom">
          <div className="provider"><span className="provider-dot" /><span><strong>Mistral</strong><small>AI provider</small></span><span className="provider-status">Connected</span></div>
          <button className="account-button" onClick={logout}><span className="avatar">J</span><span className="account-name">Private workspace<small>Sign out</small></span><span className="more">···</span></button>
        </div>
      </aside>
      {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar" />}
      <section className="main-panel">
        <header className="topbar">
          <div className="topbar-left"><button className="icon-button mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Open menu">☰</button><span className="crumb-muted">Workspace</span><span className="crumb-sep">/</span><span className="crumb-current">{active?.title || "New task"}</span></div>
          <div className="topbar-right"><span className="model-pill"><span className="provider-dot" /> Mistral</span><button className="icon-button" onClick={newTask} aria-label="New task">＋</button></div>
        </header>
        <div className="conversation">
          {active?.messages.length ? (
            <div className="message-list">
              {active.messages.map((message, index) => (
                <article className={`message-row ${message.role}`} key={index}>
                  <div className={`message-avatar ${message.role}`}>{message.role === "user" ? "J" : "✳"}</div>
                  <div className="message-content"><div className="message-author">{message.role === "user" ? "You" : "Carms"}</div><div className="message-text">{message.content}</div></div>
                </article>
              ))}
              {busy && <div className="thinking"><span className="provider-dot" /> Mistral is thinking<span className="typing-dots">···</span></div>}
              <div ref={bottomRef} />
            </div>
          ) : (
            <div className="welcome">
              <div className="welcome-symbol">✳</div><p className="eyebrow">A CLEARER WAY TO BUILD</p>
              <h1>What are we<br /><span>working on?</span></h1>
              <p className="welcome-copy">Bring an idea, a tricky bug, or a half-finished thought.<br className="desktop-break" /> We'll work through it together.</p>
              <div className="starter-grid">
                {starters.map((item) => <button className="starter-card" key={item.title} onClick={() => setPrompt(item.prompt)}>
                  <span className="starter-icon">{item.icon}</span><span><strong>{item.title}</strong><small>{item.title === "Build something" ? "Turn an idea into a plan" : item.title === "Find a bug" ? "Trace the problem" : item.title === "Understand code" ? "Make the complex clear" : "Think through the trade-offs"}</small></span><span className="starter-arrow">↗</span>
                </button>)}
              </div>
            </div>
          )}
        </div>
        <div className="composer-wrap">
          {error && <div className="inline-error" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></div>}
          <form className="composer" onSubmit={(event: FormEvent) => { event.preventDefault(); void send(); }}>
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={onComposerKey}
              placeholder="Ask anything about your code…" rows={3} maxLength={12000} disabled={busy} />
            <div className="composer-footer"><span className="composer-hint"><kbd>↵</kbd> to send · <kbd>⇧ ↵</kbd> for new line</span>
              <button className="send-button" type="submit" disabled={busy || !prompt.trim()} aria-label="Send message">{busy ? <span className="spinner" /> : "↑"}</button>
            </div>
          </form>
          <p className="disclaimer">Carms can make mistakes. Review code and suggestions before using them.</p>
        </div>
      </section>
    </main>
  );
}