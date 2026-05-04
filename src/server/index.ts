import { Hono } from "hono";
import { streamText } from "hono/streaming";
import { env } from "hono/adapter";
import { config } from "dotenv";

// Load .env file explicitly
config();

const app = new Hono();

// Global error handler
app.onError((err, c) => {
  console.error("Hono Server Error:", err);
  return c.json({ error: "Internal Server Error", message: err.message }, 500);
});

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const SYSTEM_PROMPT =
  "You are a thoughtful, concise assistant. Use clean Markdown when helpful. Be direct, friendly, and avoid unnecessary preamble.";

app.post("/api/chat", async (c) => {
  const { GROQ_API_KEY } = env<{ GROQ_API_KEY: string }>(c);
  const apiKey = GROQ_API_KEY || process.env.GROQ_API_KEY;

  if (!apiKey) {
    return c.json({ error: "GROQ_API_KEY is not configured. Please add it to your .env file." }, 500);
  }

  const payload = await c.req.json().catch(() => ({}));
  const messages = Array.isArray(payload.messages) ? payload.messages : [];

  if (messages.length === 0) {
    return c.json({ error: "messages array is required." }, 400);
  }

  const cleaned: ChatMessage[] = messages
    .filter(
      (m) =>
        m &&
        typeof m.content === "string" &&
        m.content.length > 0 &&
        m.content.length < 16000 &&
        ["user", "assistant", "system"].includes(m.role),
    )
    .slice(-30);

  const model = payload.model || "llama-3.3-70b-versatile";

  const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...cleaned.filter((m) => m.role !== "system"),
      ],
    }),
  });

  if (!groqRes.ok || !groqRes.body) {
    const text = await groqRes.text().catch(() => "");
    return c.json({ error: `Upstream error (${groqRes.status})`, detail: text.slice(0, 500) }, 502);
  }

  console.log("Connecting to Groq stream...");

  return streamText(c, async (stream) => {
    const reader = groqRes.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    c.header("X-Accel-Buffering", "no");

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const data = trimmed.slice(5).trim();
          if (data === "[DONE]") return;
          
          try {
            const json = JSON.parse(data);
            console.log("Groq JSON Chunk:", JSON.stringify(json, null, 2));
            const delta = json?.choices?.[0]?.delta?.content;
            if (delta) {
              await stream.write(delta);
            }
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error("Stream error:", err);
    } finally {
      reader.releaseLock();
      console.log("Server stream closed");
    }
  });
});

export default app;
