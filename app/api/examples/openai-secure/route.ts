import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_PROMPT_LENGTH = 2_000;

function jsonError(status: number, detail: string) {
  return NextResponse.json({ detail }, { status });
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  if (!apiKey) {
    return jsonError(500, "OpenAI server configuration is missing.");
  }

  let body: { prompt?: unknown };
  try {
    body = (await request.json()) as { prompt?: unknown };
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > MAX_PROMPT_LENGTH) {
    return jsonError(400, "Prompt must be between 1 and 2000 characters.");
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "system",
            content: "You are a concise server-side analysis helper. Do not provide investment advice.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      return jsonError(502, "OpenAI request failed.");
    }

    const result = (await response.json()) as { output_text?: string };
    return NextResponse.json({ text: result.output_text ?? "" });
  } catch {
    return jsonError(502, "OpenAI request failed.");
  }
}
