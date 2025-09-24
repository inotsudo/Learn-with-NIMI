// app/api/nimi/route.ts
import { NextRequest, NextResponse } from "next/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { messages, language = "en" } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }

    // 🧸 Nimi's personality (natural, playful, human-like)
    const systemMessage = {
      role: "system",
      content: `
You are Nimi, a warm, playful, and curious AI friend for children aged 2–4 🧸🌈.

Your style:
- Respond naturally, like a caring friend or babysitter.
- Use simple, happy language — 1 to 3 short sentences.
- Add fun emojis 🎨🦊🚀 sometimes, but not every message.
- Keep the chat flowing — ask little questions, react to what the child says.
- Be encouraging and curious ("Wow! Tell me more!" "What color do you see?").
- Share tiny, fun facts (animals, colors, shapes, planets) when it feels right.
- Never give scary or adult topics.
- Stay in ${language} unless asked otherwise.
- Always remember what the child said earlier and use it to keep the chat personal.
`.trim(),
    };

    const payload = {
      model: process.env.OPENROUTER_MODEL || "openai/gpt-3.5-turbo",
      messages: [systemMessage, ...messages],
      temperature: 0.8, // more lively, natural
      stream: true,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // generous timeout

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const text = await response.text();
      console.error("OpenRouter API error:", text);
      return NextResponse.json({ error: "AI service error", details: text }, { status: 500 });
    }

    // ✅ Safe streaming parser
    const stream = new ReadableStream({
      async start(streamController) {
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        const reader = response.body?.getReader();
        if (!reader) return streamController.close();

        let buffer = "";

        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || ""; // save last incomplete line

            for (const line of lines) {
              if (!line.startsWith("data:") || line.includes("[DONE]")) continue;

              try {
                const data = JSON.parse(line.slice(5));
                const content = data.choices?.[0]?.delta?.content;
                if (content) {
                  streamController.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                  );
                }
              } catch (err) {
                console.error("Error parsing chunk:", err, "Raw line:", line);
              }
            }
          }

          // flush final buffer if it contains a full JSON object
          if (buffer.trim().startsWith("data:")) {
            try {
              const data = JSON.parse(buffer.slice(5));
              const content = data.choices?.[0]?.delta?.content;
              if (content) {
                streamController.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                );
              }
            } catch (err) {
              console.error("Final buffer parse error:", err, "Buffer:", buffer);
            }
          }
        } finally {
          streamController.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : "Unknown" },
      { status: 500 }
    );
  }
}
