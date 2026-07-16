// app/api/nimi/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

export const runtime = "edge";

// 🇷🇼 Reviews/rewrites Kinyarwanda replies into natural, everyday spoken Kinyarwanda.
const KINYARWANDA_GUARDIAN_PROMPT = `You are Nimi's Kinyarwanda Language Guardian.

Your job is to review and improve any Kinyarwanda response before it is shown to the user.

GOAL:
Make every Kinyarwanda response sound like it was written by a native Rwandan speaker using natural everyday Kinyarwanda.

RULES:

1. Preserve the original meaning.
2. Preserve facts, instructions, and educational content.
3. Rewrite unnatural, translated, robotic, or overly formal Kinyarwanda.
4. Use common spoken Kinyarwanda used in Rwanda today.
5. Prefer shorter and more conversational sentences.
6. Sound friendly, warm, and natural.
7. If the audience is a child, use child-friendly language.
8. Never mix unnecessary English words into Kinyarwanda.
9. Never translate English sentence structures literally.
10. If the original response is already natural, return it unchanged.

AVOID PHRASES LIKE:
- Ni iki nakunganira?
- Muri iki gihe
- Ndagusaba
- Birashoboka ko
- Nishimiye kugufasha
- Mu rwego rwo
- Birakwiye ko

PREFER:
- Nagufasha iki?
- Ubu
- Mbwira
- Wenda
- Reka turebere hamwe
- Gerageza nanone
- Wabikoze neza
- Yego
- Oya

STYLE REQUIREMENTS:

- Sound like a native Rwandan speaker.
- Sound natural when spoken aloud.
- Avoid sounding like a translated government document.
- Avoid sounding like a machine.
- Use language commonly understood by primary and secondary school students.
- Maintain politeness without becoming overly formal.

QUALITY CHECK BEFORE RETURNING:

Ask yourself:
"Would an average Rwandan naturally say this in a normal conversation?"

If NO:
Rewrite again.

If YES:
Return the improved version.

OUTPUT:
Return ONLY the improved Kinyarwanda response.
Do not explain your changes.
Do not provide analysis.
Do not provide notes.`;

interface OpenRouterMessage {
  role: string;
  content: string;
}

async function fetchOpenRouterReply(
  messages: OpenRouterMessage[],
  model: string,
  temperature: number,
  signal: AbortSignal
): Promise<string> {
  const res = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model, messages, temperature, stream: false }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenRouter API error: ${text}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export async function POST(req: NextRequest) {
  if (!OPENROUTER_API_KEY) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const authClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { messages, language = "en", childName = "", storyTitle = null, storyEmoji = null, storyProgress = 0, slotsDone = 0, slotsTotal = 0 } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid request format" }, { status: 400 });
    }
    if (messages.length > 20) {
      return NextResponse.json({ error: "Too many messages" }, { status: 400 });
    }
    if (messages.some((m: OpenRouterMessage) => typeof m.content !== "string" || m.content.length > 500)) {
      return NextResponse.json({ error: "Message too long" }, { status: 400 });
    }

    const LANGUAGE_NAMES: Record<string, string> = {
      en: "English",
      fr: "French",
      rw: "Kinyarwanda",
    };
    const languageName = LANGUAGE_NAMES[language] || "English";
    const languageInstruction =
      language === "rw"
        ? `Reply only in natural, native Kinyarwanda (Ikinyarwanda) as spoken by people in Rwanda — correct grammar and everyday vocabulary a young Rwandan child would hear at home. Do not switch to French or English, and do not mix in French/English words, except for a child's own name.`
        : `Stay in ${languageName} unless asked otherwise.`;

    const storyContext = storyTitle
      ? `\n\nRight now, ${childName || "this child"} is reading the story "${storyTitle}" ${storyEmoji ?? ""}. They have completed ${slotsDone} out of ${slotsTotal} story missions (${Math.round(storyProgress * 100)}% done). You can ask them what they thought of the story, their favourite character, a funny part, or what they learned. Make references to the story to make the conversation feel magical and personal.`
      : "";

    // 🧸 Nimi's personality (natural, playful, human-like)
    const systemMessage = {
      role: "system",
      content: `
You are Nimi, a warm, playful, and curious AI friend for children aged 2–10 🧸🌈.
${childName ? `You're chatting with ${childName} right now — use their name sometimes to make it feel personal and special.` : ""}${storyContext}

Your style:
- Respond naturally, like a caring friend or babysitter.
- Use simple, happy language — 1 to 3 short sentences.
- Add fun emojis 🎨🦊🚀 sometimes, but not every message.
- Keep the chat flowing — ask little questions, react to what the child says.
- Be encouraging and curious ("Wow! Tell me more!" "What's your favourite part?").
- Share tiny, fun facts (animals, colors, shapes, planets) when it feels right.
- Turn everyday moments into little games, jokes, or silly songs to keep things fun.
- Celebrate wins enthusiastically and gently cheer the child up if they sound sad or bored.
- Never give scary or adult topics.
- ${languageInstruction}
- Always remember what the child said earlier and use it to keep the chat personal.
`.trim(),
    };

    const model = process.env.OPENROUTER_MODEL || "openai/gpt-4o-mini";
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // stay under Vercel edge 25s limit

    // 🇷🇼 Kinyarwanda: generate, then run through the Language Guardian for a natural rewrite,
    // then stream the polished result word-by-word so the UI keeps its typing effect.
    if (language === "rw") {
      try {
        const rawReply = await fetchOpenRouterReply([systemMessage, ...messages], model, 0.8, controller.signal);

        let finalReply = rawReply;
        if (rawReply.trim()) {
          try {
            const guardianMessages: OpenRouterMessage[] = [
              { role: "system", content: KINYARWANDA_GUARDIAN_PROMPT },
              {
                role: "user",
                content: `Rewrite the following response into natural native Kinyarwanda while preserving the exact meaning.\n\nResponse:\n${rawReply}`,
              },
            ];
            const improved = await fetchOpenRouterReply(guardianMessages, model, 0.3, controller.signal);
            if (improved.trim()) finalReply = improved.trim();
          } catch (err) {
            console.error("Kinyarwanda guardian rewrite failed, using raw reply:", err);
          }
        }

        clearTimeout(timeoutId);

        const stream = new ReadableStream({
          async start(streamController) {
            const encoder = new TextEncoder();
            const parts = finalReply.match(/\s+|\S+/g) || [];
            for (const part of parts) {
              streamController.enqueue(encoder.encode(`data: ${JSON.stringify({ content: part })}\n\n`));
              await new Promise(r => setTimeout(r, 25));
            }
            streamController.close();
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
        clearTimeout(timeoutId);
        console.error("Nimi Kinyarwanda pipeline error:", error);
        return NextResponse.json({ error: "AI service error" }, { status: 500 });
      }
    }

    const payload = {
      model,
      messages: [systemMessage, ...messages],
      temperature: 0.8, // more lively, natural
      stream: true,
    };

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
      return NextResponse.json({ error: "AI service error" }, { status: 500 });
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
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
