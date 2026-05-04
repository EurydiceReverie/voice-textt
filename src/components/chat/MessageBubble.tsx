import ReactMarkdown from "react-markdown";
import { Volume2, VolumeX, Copy, Check, Mic } from "lucide-react";
import { useState } from "react";
import type { Message } from "@/lib/chat-storage";
import { speak, stopSpeaking } from "@/lib/speech";
import { cn } from "@/lib/utils";

interface Props {
  message: Message;
  streaming?: boolean;
}

export function MessageBubble({ message, streaming }: Props) {
  const isUser = message.role === "user";
  const [speaking, setSpeaking] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggleSpeak = () => {
    if (speaking) {
      stopSpeaking();
      setSpeaking(false);
    } else {
      speak(message.content);
      setSpeaking(true);
      // crude end-detection
      const check = setInterval(() => {
        if (typeof window !== "undefined" && !window.speechSynthesis.speaking) {
          setSpeaking(false);
          clearInterval(check);
        }
      }, 400);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className={cn("fade-in-up flex w-full gap-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
          <Mic className="h-3.5 w-3.5" />
        </div>
      )}
      <div className={cn("group flex max-w-[85%] flex-col gap-1.5", isUser && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
            isUser
              ? "bg-foreground text-background"
              : "text-foreground",
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <>
              {message.content ? (
                <div className="prose prose-neutral dark:prose-invert max-w-none prose-p:text-foreground prose-headings:text-foreground prose-strong:text-foreground prose-li:text-foreground prose-a:text-foreground prose-p:my-2 prose-pre:my-3 prose-pre:rounded-xl prose-pre:bg-muted prose-pre:text-foreground prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none prose-code:rounded prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:text-[0.85em] prose-headings:mt-4 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                  {streaming && (
                    <span
                      aria-hidden
                      className="ml-0.5 inline-block h-[1em] w-[2px] -translate-y-[-2px] animate-pulse bg-foreground/60 align-middle"
                    />
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-1 py-1.5" aria-label="Thinking">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40" />
                </div>
              )}
            </>
          )}
        </div>

        {!isUser && message.content && !streaming && (
          <div className="flex gap-1 pl-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <button
              onClick={copy}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              aria-label="Copy"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={toggleSpeak}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              aria-label={speaking ? "Stop speaking" : "Read aloud"}
            >
              {speaking ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}