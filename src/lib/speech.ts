// Minimal browser SpeechRecognition wrapper. Returns null if unsupported.

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyWindow = Window & {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
};

export function getSpeechRecognition(): any | null {
  if (typeof window === "undefined") return null;
  const w = window as AnyWindow;
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

export async function requestMicPermission(): Promise<boolean> {
  // Security check: browsers only allow mic access on localhost or HTTPS
  if (!window.isSecureContext) {
    console.error("Microphone access requires a secure context (localhost or HTTPS).");
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Stop the stream immediately after getting permission
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (err) {
    console.error("Microphone permission error:", err);
    return false;
  }
}

export function speak(text: string) {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 1.02;
  utter.pitch = 1;
  // Prefer a natural-sounding English voice if available
  const voices = window.speechSynthesis.getVoices();
  const preferred =
    voices.find((v) => /Samantha|Karen|Daniel|Google US English|Natural/i.test(v.name)) ||
    voices.find((v) => v.lang.startsWith("en"));
  if (preferred) utter.voice = preferred;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utter);
}

export function stopSpeaking() {
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
}