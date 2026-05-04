import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Menu, Mic, PanelLeft, Sun, Moon } from "lucide-react";
import {
  loadConversations,
  saveConversations,
  makeId,
  deriveTitle,
  type Conversation,
  type Message,
} from "@/lib/chat-storage";
import { Sidebar } from "@/components/chat/Sidebar";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { Composer } from "@/components/chat/Composer";

const SUGGESTIONS = [
  "Explain quantum entanglement simply",
  "Draft a short, polite follow-up email",
  "Plan a 3-day trip to Lisbon",
  "Compare React, Vue and Svelte",
];

export default function ChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [activeStream, setActiveStream] = useState<{ id: string; content: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Keep ref in sync
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sidebarWidthRef = useRef(280);

  // Hydrate from localStorage
  useEffect(() => {
    const list = loadConversations();
    setConversations(list);
    if (list.length > 0) setActiveId(list[0].id);
    // Restore sidebar prefs
    try {
      const w = Number(localStorage.getItem("ava.sidebar.width"));
      if (w >= 220 && w <= 480) {
        setSidebarWidth(w);
        sidebarWidthRef.current = w;
      }
      const c = localStorage.getItem("ava.sidebar.collapsed");
      if (c === "1") setSidebarCollapsed(true);
      const t = localStorage.getItem("ava.theme");
      const prefersDark =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initial = (t as "light" | "dark" | null) ?? (prefersDark ? "dark" : "light");
      setTheme(initial);
    } catch {
      /* ignore */
    }
  }, []);

  // Apply theme class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try { localStorage.setItem("ava.theme", theme); } catch { /* ignore */ }
  }, [theme]);

  // Persist sidebar prefs
  useEffect(() => {
    try {
      localStorage.setItem("ava.sidebar.width", String(sidebarWidth));
    } catch { /* ignore */ }
  }, [sidebarWidth]);
  useEffect(() => {
    try {
      localStorage.setItem("ava.sidebar.collapsed", sidebarCollapsed ? "1" : "0");
    } catch { /* ignore */ }
  }, [sidebarCollapsed]);

  // Drag-to-resize: write a CSS var on each frame, only commit to React on release.
  const handleResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = sidebarWidthRef.current;
    let pending = startWidth;
    let raf = 0;

    document.body.classList.add("is-resizing");
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const apply = () => {
      raf = 0;
      document.documentElement.style.setProperty("--sidebar-w", `${pending}px`);
    };

    const onMove = (ev: PointerEvent) => {
      pending = Math.max(220, Math.min(480, startWidth + (ev.clientX - startX)));
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (raf) cancelAnimationFrame(raf);
      document.body.classList.remove("is-resizing");
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      sidebarWidthRef.current = pending;
      setSidebarWidth(pending); // single React update
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  // Keep CSS var in sync with React state
  useEffect(() => {
    document.documentElement.style.setProperty("--sidebar-w", `${sidebarWidth}px`);
  }, [sidebarWidth]);

  // Persist
  useEffect(() => {
    if (conversations.length > 0 || loadConversations().length > 0) {
      saveConversations(conversations);
    }
  }, [conversations]);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId],
  );

  // Auto scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [active?.messages.length, active?.messages[active.messages.length - 1]?.content]);

  const newChat = useCallback(() => {
    setActiveId(null);
    setSidebarOpen(false);
  }, []);

  const deleteChat = useCallback(
    (id: string) => {
      setConversations((prev) => {
        const next = prev.filter((c) => c.id !== id);
        saveConversations(next);
        return next;
      });
      if (activeId === id) setActiveId(null);
    },
    [activeId],
  );

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setStreaming(false);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      const uId = makeId();
      const aId = makeId();
      const userMsg: Message = { id: uId, role: "user", content: text, createdAt: Date.now() };
      const assistantMsg: Message = { id: aId, role: "assistant", content: "", createdAt: Date.now() };

      let targetConvoId = activeIdRef.current;
      
      // 1. Setup Conversation
      setConversations((prev) => {
        let convo = prev.find((c) => c.id === targetConvoId);
        if (!convo) {
          const newConvo: Conversation = {
            id: makeId(),
            title: deriveTitle(text),
            messages: [userMsg, assistantMsg],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          targetConvoId = newConvo.id;
          activeIdRef.current = newConvo.id;
          setActiveId(newConvo.id);
          return [newConvo, ...prev];
        }
        return prev.map((c) =>
          c.id === targetConvoId
            ? { ...c, messages: [...c.messages, userMsg, assistantMsg], updatedAt: Date.now() }
            : c
        );
      });

      setStreaming(true);
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: [{ role: "user", content: text }], // Start simple to verify flow
          }),
        });

        if (!res.ok || !res.body) throw new Error("API Error");

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let acc = "";
        
        setActiveStream({ id: aId, content: "" });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          acc += chunk;
          setActiveStream({ id: aId, content: acc });
        }

        // Commit to history when done
        const finalAcc = acc;
        setConversations(prev => prev.map(c => 
          c.id === targetConvoId 
            ? { ...c, messages: c.messages.map(m => m.id === aId ? { ...m, content: finalAcc } : m) } 
            : c
        ));
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          const errorMsg = "⚠️ Network error. Please try again.";
          setActiveStream({ id: aId, content: errorMsg });
        }
      } finally {
        setStreaming(false);
        setActiveStream(null);
        abortRef.current = null;
      }
    },
    [],
  );

  const showEmpty = !active || active.messages.length === 0;

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          setSidebarOpen(false);
        }}
        onNew={newChat}
        onDelete={deleteChat}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((v) => !v)}
        onResizeStart={handleResizeStart}
      />

      <main className="relative flex h-full min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 shrink-0 items-center gap-2 px-3 md:px-5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground md:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          {sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(false)}
              className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground md:flex"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
          <h1 className="truncate text-sm font-medium text-foreground/80">
            {active?.title || "New conversation"}
          </h1>
          <div className="ml-auto">
            <button
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              aria-label="Toggle theme"
              title={theme === "dark" ? "Light mode" : "Dark mode"}
            >
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8">
            {showEmpty ? (
              <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-lg">
                  <Mic className="h-6 w-6" />
                </div>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground">
                  AI Voice Assistant
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Speak or type — replies stream back in real time.
                </p>
                <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendMessage(s)}
                      className="glass-panel rounded-2xl px-4 py-3 text-left text-sm text-foreground/80 transition-all duration-200 hover:bg-background/80 hover:text-foreground hover:shadow-md"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6 pb-4">
                {active!.messages.map((m, i) => {
                  const isLastAssistant = streaming && i === active!.messages.length - 1 && m.role === "assistant";
                  const displayContent = (activeStream && activeStream.id === m.id) ? activeStream.content : m.content;
                  
                  return (
                    <MessageBubble
                      key={m.id}
                      message={{ ...m, content: displayContent }}
                      streaming={isLastAssistant}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="px-4 pb-5 pt-2 md:px-8">
          <div className="mx-auto w-full max-w-3xl">
            <Composer
              onSend={sendMessage}
              onStop={stopStream}
              streaming={streaming}
              disabled={streaming}
            />
            <p className="mt-2 text-center text-[11px] text-muted-foreground">
              AI can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
