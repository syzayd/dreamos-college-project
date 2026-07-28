import { useEffect, useRef, useState } from "react";
import "./App.css";
import {
  applyOrganization,
  checkHealth,
  revertOrganization,
  runIndex,
  sendChatMessage,
  type ChatResponse,
  type OrganizeSuggestion,
} from "./api";

interface HistoryEntry {
  role: "user" | "assistant";
  response?: ChatResponse;
  text?: string;
}

function SearchResults({ response }: { response: ChatResponse }) {
  if (response.search_results.length === 0) return null;
  return (
    <div className="card-grid">
      {response.search_results.map((hit) => (
        <div className="card" key={hit.path}>
          <div className="card-title">{hit.name}</div>
          <div className="card-meta">
            <span className="pill">{Math.round(hit.similarity * 100)}% match</span>
            {hit.category && <span className="pill pill-muted">{hit.category}</span>}
          </div>
          <div className="card-snippet">{hit.snippet}</div>
          <div className="card-path">{hit.path}</div>
        </div>
      ))}
    </div>
  );
}

function OrganizeResults({ response }: { response: ChatResponse }) {
  const [statuses, setStatuses] = useState<Record<string, "pending" | "applied" | "reverted">>({});

  if (response.organize_suggestions.length === 0) return null;

  async function handleApply(s: OrganizeSuggestion) {
    await applyOrganization(s.path);
    setStatuses((prev) => ({ ...prev, [s.path]: "applied" }));
  }

  async function handleRevert(s: OrganizeSuggestion) {
    await revertOrganization(`${s.category}/${s.name}`);
    setStatuses((prev) => ({ ...prev, [s.path]: "reverted" }));
  }

  return (
    <div className="card-grid">
      {response.organize_suggestions.map((s) => {
        const status = statuses[s.path] ?? "pending";
        return (
          <div className="card" key={s.path}>
            <div className="card-title">{s.name}</div>
            <div className="card-meta">
              <span className="pill">{s.category}</span>
              {s.tags.map((t) => (
                <span className="pill pill-muted" key={t}>
                  {t}
                </span>
              ))}
            </div>
            <div className="card-snippet">{s.summary}</div>
            <div className="card-reasoning">{s.reasoning}</div>
            <div className="card-actions">
              {status === "pending" && (
                <button className="btn-small" onClick={() => handleApply(s)}>
                  Apply
                </button>
              )}
              {status === "applied" && (
                <>
                  <span className="status-ok">Moved to {s.category}/</span>
                  <button className="btn-small btn-ghost" onClick={() => handleRevert(s)}>
                    Undo
                  </button>
                </>
              )}
              {status === "reverted" && <span className="status-muted">Reverted</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function App() {
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [backendUp, setBackendUp] = useState<boolean | null>(null);
  const [indexStatus, setIndexStatus] = useState<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkHealth().then(setBackendUp);
    const interval = setInterval(() => checkHealth().then(setBackendUp), 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history]);

  async function handleSend() {
    const trimmed = message.trim();
    if (!trimmed || loading) return;
    setMessage("");
    setHistory((prev) => [...prev, { role: "user", text: trimmed }]);
    setLoading(true);
    try {
      const response = await sendChatMessage(trimmed);
      setHistory((prev) => [...prev, { role: "assistant", response }]);
    } catch (err) {
      setHistory((prev) => [
        ...prev,
        { role: "assistant", text: err instanceof Error ? err.message : String(err) },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleReindex() {
    setIndexStatus("Indexing...");
    try {
      const result = await runIndex();
      setIndexStatus(
        `Indexed ${result.indexed.length}, skipped ${result.skipped_unchanged.length}, errors ${
          Object.keys(result.errors).length
        }`
      );
    } catch (err) {
      setIndexStatus(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">◆</span> DreamOS
        </div>
        <div className="topbar-actions">
          <span className={`health-dot ${backendUp ? "health-up" : "health-down"}`} />
          <span className="health-label">{backendUp === null ? "checking..." : backendUp ? "backend online" : "backend offline"}</span>
          <button className="btn-small" onClick={handleReindex}>
            Reindex vault
          </button>
          {indexStatus && <span className="index-status">{indexStatus}</span>}
        </div>
      </header>

      <div className="chat-scroll" ref={scrollRef}>
        {history.length === 0 && (
          <div className="empty-state">
            <p>Describe what you're looking for, or ask DreamOS to organize your files.</p>
            <p className="empty-hint">Try: "find my resume" or "organize my unsorted files"</p>
          </div>
        )}
        {history.map((entry, i) => (
          <div className={`bubble bubble-${entry.role}`} key={i}>
            {entry.role === "user" ? (
              <div className="bubble-text">{entry.text}</div>
            ) : entry.response ? (
              <>
                <div className="bubble-text">{entry.response.message}</div>
                <SearchResults response={entry.response} />
                <OrganizeResults response={entry.response} />
              </>
            ) : (
              <div className="bubble-text bubble-error">{entry.text}</div>
            )}
          </div>
        ))}
        {loading && <div className="bubble bubble-assistant bubble-loading">thinking...</div>}
      </div>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <input
          value={message}
          onChange={(e) => setMessage(e.currentTarget.value)}
          placeholder="Ask DreamOS to find or organize something..."
          disabled={loading}
        />
        <button type="submit" disabled={loading || !message.trim()}>
          Send
        </button>
      </form>
    </main>
  );
}

export default App;
