import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, Square, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSpeechRecognition, requestMicPermission } from "@/lib/speech";
import { toast } from "sonner";

interface Props {
  onSend: (text: string) => void;
  onStop?: () => void;
  disabled?: boolean;
  streaming?: boolean;
}

export function Composer({ onSend, onStop, disabled, streaming }: Props) {
  const [value, setValue] = useState("");
  const valueRef = useRef(""); // Use a ref to avoid stale closures in callbacks
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const networkRetryRef = useRef(0);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  // Sync ref with state
  useEffect(() => {
    valueRef.current = value;
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [value]);

  const submit = () => {
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    const trimmed = valueRef.current.trim();
    if (!trimmed || disabled) return;
    
    // Clean up "end" keyword if it's at the very end
    const cleanText = trimmed.replace(/\s+end[.!?]?$/i, "").trim();
    
    onSend(cleanText);
    setValue("");
    valueRef.current = "";
    
    // Stop mic if it's running
    if (recRef.current) {
      try { recRef.current.stop(); } catch {}
    }
  };

  const resetSilenceTimer = () => {
    if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    silenceTimeoutRef.current = setTimeout(() => {
      console.log("Auto-submitting due to silence");
      submit();
    }, 2000); // 2 seconds of silence
  };

  useEffect(() => {
    const rec = getSpeechRecognition();
    if (!rec) {
      setSupported(false);
      return;
    }
    rec.continuous = true; // Stay active for long sentences
    rec.interimResults = true;
    rec.lang = "en-US";
    
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      resetSilenceTimer(); // Activity detected, reset the clock

      let finalChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) finalChunk += result[0].transcript;
      }
      
      if (finalChunk) {
        const lower = finalChunk.toLowerCase().trim();
        
        // KEYWORD DETECTION: "end"
        if (lower.endsWith("end") || lower.endsWith("end.") || lower.endsWith("end!")) {
          console.log("Keyword 'end' detected, submitting...");
          setValue((prev) => {
            const sep = prev.length === 0 || /\s$/.test(prev) ? "" : " ";
            return prev + sep + finalChunk.trim();
          });
          // Small delay to ensure state update is processed
          setTimeout(submit, 100);
          return;
        }

        setValue((prev) => {
          const sep = prev.length === 0 || /\s$/.test(prev) ? "" : " ";
          return prev + sep + finalChunk.trim();
        });
      }
    };

    rec.onstart = () => {
      setListening(true);
      resetSilenceTimer(); // Start the silence clock
    };

    rec.onend = () => {
      setListening(false);
      if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
    };
    rec.onerror = (e: any) => {
      console.error("Speech recognition error:", e.error, e.message);
      setListening(false);
      
      if (e.error === "network") {
        // HARD RESET: Kill the engine and set to null so it re-inits
        recRef.current = null;
        toast.error("Microphone Connection Issue", {
          description: "The browser's speech service timed out. We've reset the engine — please try clicking the mic again.",
        });
      } else if (e.error === "not-allowed") {
        toast.error("Microphone Permission Denied", {
          description: "Please allow microphone access in your browser settings.",
        });
      }
    };
    recRef.current = rec;
    return () => {
      if (recRef.current) {
        try { recRef.current.abort(); } catch { /* noop */ }
      }
    };
  }, []);

  const initSpeech = () => {
    const rec = getSpeechRecognition();
    if (!rec) return null;
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    
    rec.onresult = (e: any) => {
      resetSilenceTimer();
      let finalChunk = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) finalChunk += result[0].transcript;
      }
      if (finalChunk) {
        const lower = finalChunk.toLowerCase().trim();
        if (lower.endsWith("end") || lower.endsWith("end.") || lower.endsWith("end!")) {
          setValue((prev) => prev + (prev ? " " : "") + finalChunk.trim());
          setTimeout(submit, 100);
          return;
        }
        setValue((prev) => prev + (prev ? " " : "") + finalChunk.trim());
      }
    };
    rec.onstart = () => { 
      setListening(true); 
      resetSilenceTimer(); 
      networkRetryRef.current = 0; // Reset retries on success
    };
    rec.onend = () => { setListening(false); };
    rec.onerror = (e: any) => {
      console.error("Speech engine error:", e.error);
      setListening(false);
      
      if (e.error === "network" && networkRetryRef.current < 2) {
        networkRetryRef.current++;
        console.log(`Network error detected, auto-retry ${networkRetryRef.current}/2...`);
        setTimeout(() => {
          recRef.current = initSpeech();
          try { recRef.current?.start(); } catch {}
        }, 1000);
      } else {
        recRef.current = null;
        if (e.error === "network") {
          toast.error("Mic Connection Failed", {
            description: "The speech service is having trouble. Please check your internet or type your message.",
          });
        }
      }
    };
    return rec;
  };

  const toggleMic = () => {
    if (listening) {
      try { recRef.current?.stop(); } catch { setListening(false); }
      return;
    }

    requestMicPermission().then((granted) => {
      if (!granted) return;
      
      // Ensure we have an active engine
      if (!recRef.current) {
        recRef.current = initSpeech();
      }

      if (!recRef.current) return;

      setTimeout(() => {
        try {
          recRef.current.start();
        } catch (err) {
          console.error("Mic start failed, retrying...", err);
          recRef.current = initSpeech();
          setTimeout(() => recRef.current?.start(), 500);
        }
      }, 400);
    });
  };


  return (
    <div className="glass-strong glass-panel relative flex items-end gap-2 rounded-3xl px-3 py-2.5 transition-shadow focus-within:shadow-lg">
      <button
        type="button"
        onClick={toggleMic}
        disabled={!supported}
        title={supported ? "Voice input" : "Voice input not supported"}
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200",
          listening
            ? "bg-foreground text-background"
            : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
          !supported && "cursor-not-allowed opacity-40",
        )}
      >
        {!supported ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      </button>

      <textarea
        ref={taRef}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        rows={1}
        placeholder={listening ? "Listening…" : "Message Lumen…"}
        className="scrollbar-thin max-h-[200px] flex-1 resize-none bg-transparent px-1 py-2 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
      />

      {streaming ? (
        <button
          type="button"
          onClick={onStop}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-all duration-200 hover:opacity-90 active:scale-95"
          aria-label="Stop"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
        </button>
      ) : (
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim() || disabled}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-all duration-200 active:scale-95",
            value.trim() && !disabled
              ? "bg-foreground text-background hover:opacity-90"
              : "bg-muted text-muted-foreground",
          )}
          aria-label="Send"
        >
          <ArrowUp className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}