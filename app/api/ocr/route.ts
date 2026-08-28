import { NextResponse } from "next/server";

// Server-only — the Groq key never reaches the browser. Called by
// lib/pipeline.ts's runOcr() from the upload flow.
const GROQ_API_KEY = process.env.GROQ_API_KEY!;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const VISION_MODEL = "qwen/qwen3.6-27b";

const EXTRACTION_PROMPT =
  "Extract all visible text from this image exactly as written, including stylized, curved, or decorative text. Return only the extracted text, nothing else.";

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
    }

    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        reasoning_effort: "none",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: EXTRACTION_PROMPT },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (groqRes.status === 429) {
      return NextResponse.json(
        { error: "Daily limit reached, please try again later" },
        { status: 429 }
      );
    }

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      return NextResponse.json(
        { error: `Groq OCR failed: ${groqRes.status} ${errText}` },
        { status: 502 }
      );
    }

    const data = await groqRes.json();
    const rawText = data.choices?.[0]?.message?.content ?? "";

    const text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

    return NextResponse.json({ text });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
