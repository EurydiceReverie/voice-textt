import { Plus, MessageSquare, Trash2, Mic, PanelLeftClose, PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Conversation } from "@/lib/chat-storage";

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onResizeStart: (e: React.PointerEvent) => void;
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  open,
  onClose,
  collapsed,
  onToggleCollapsed,
  onResizeStart,
}: SidebarProps) {
  return (
    <>
      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-30 bg-foreground/10 backdrop-blur-sm transition-opacity md:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        style={{ width: collapsed ? 64 : "var(--sidebar-w, 280px)" }}
        className={cn(
          "glass-panel fixed inset-y-0 left-0 z-40 flex shrink-0 flex-col rounded-none border-y-0 border-l-0 md:static md:translate-x-0",
          // Animate transform/width changes BUT not during active drag (suppressed by body.is-resizing)
          "transition-[transform] duration-300",
          collapsed ? "transition-[width,transform] duration-300" : "",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        )}
      >
        {/* Header: logo + collapse */}
        <div className={cn("flex items-center gap-2 px-3 pt-4 pb-3", collapsed && "justify-center px-2")}>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-foreground text-background">
            <Mic className="h-4 w-4" />
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 truncate text-[14px] font-semibold tracking-tight">
                AI Voice Assistant
              </div>
              <button
                onClick={onToggleCollapsed}
                className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground md:flex"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {collapsed && (
          <button
            onClick={onToggleCollapsed}
            className="mx-auto mb-2 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
        )}

        {/* New chat */}
        <div className={cn("px-3", collapsed && "px-2")}>
          <button
            onClick={onNew}
            title="New chat"
            className={cn(
              "flex w-full items-center gap-2 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5 text-sm font-medium text-foreground transition-all duration-200 hover:bg-background/80 hover:shadow-sm active:scale-[0.99]",
              collapsed && "justify-center px-0",
            )}
          >
            <Plus className="h-4 w-4 shrink-0" />
            {!collapsed && <span>New chat</span>}
          </button>
        </div>

        {!collapsed && (
          <div className="mt-5 px-5 pb-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Recent
          </div>
        )}

        <div className={cn("scrollbar-thin flex-1 overflow-y-auto px-2 pb-4", collapsed && "mt-4")}>
          {conversations.length === 0 ? (
            !collapsed && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                No conversations yet
              </div>
            )
          ) : (
            <ul className="space-y-0.5">
              {conversations.map((c) => {
                const active = c.id === activeId;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => onSelect(c.id)}
                      title={c.title}
                      className={cn(
                        "group flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-150",
                        collapsed && "justify-center px-2",
                        active
                          ? "bg-background/80 text-foreground shadow-sm"
                          : "text-foreground/75 hover:bg-background/50 hover:text-foreground",
                      )}
                    >
                      <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      {!collapsed && (
                        <>
                          <span className="flex-1 truncate">{c.title}</span>
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDelete(c.id);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.stopPropagation();
                                onDelete(c.id);
                              }
                            }}
                            className="rounded p-1 opacity-0 transition-opacity hover:bg-foreground/5 group-hover:opacity-100"
                            aria-label="Delete conversation"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </span>
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {!collapsed && (
          <div className="border-t border-border/50 px-5 py-3 text-[11px] text-muted-foreground">
            Powered by Groq · Llama 3.3
          </div>
        )}

        {/* Resize handle (desktop only, when not collapsed) */}
        {!collapsed && (
          <div
            onPointerDown={onResizeStart}
            className="absolute inset-y-0 right-0 hidden w-1.5 cursor-col-resize items-center justify-center md:flex group"
            aria-label="Resize sidebar"
          >
            <div className="h-12 w-px bg-border transition-colors group-hover:bg-foreground/40" />
          </div>
        )}
      </aside>
    </>
  );
}
