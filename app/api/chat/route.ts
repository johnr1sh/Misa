import { NextRequest, NextResponse } from "next/server";
import { hasSession } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are Misa, a practical AI coding partner inspired by focused coding workspaces.
Help the user plan, understand, write, debug, and review software. Be precise and honest.
When asked to change a codebase, explain the files and changes that would be needed. Do not claim to have
accessed, edited, executed, or tested files unless the user has actually provided a connected tool that did so.
Prefer complete, usable code when asked. Keep responses readable and avoid unnecessary ceremony.`;

export async function POST(request: NextRequest) {
  if (!(await hasSession())) {
    return NextResponse.json({ error: "Your session has expired. Sign in again." }, { status: 401 });
  }
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Mistral is not configured. Add MISTRAL_API_KEY in Vercel." }, { status: 503 });

  let messages: ChatMessage[];
  try {
    const body = await request.json();
    if (!Array.isArray(body.messages) || body.messages.length < 1 || body.messages.length > 24) {
      return NextResponse.json({ error: "Send between 1 and 24 messages." }, { status: 400 });
    }
    messages = body.messages.map((message: unknown) => {
      if (!message || typeof message !== "object") throw new Error("Invalid message.");
      const item = message as Record<string, unknown>;
      if ((item.role !== "user" && item.role !== "assistant") || typeof item.content !== "string") throw new Error("Invalid message.");
      const content = item.content.trim();
      if (!content || content.length > 12000) throw new Error("Each message must contain 1 to 12,000 characters.");
      return { role: item.role, content };
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid request." }, { status: 400 });
  }

  try {
    const upstream = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.MISTRAL_MODEL || "mistral-large-latest",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        temperature: 0.2, max_tokens: 4096,
      }),
      signal: AbortSignal.timeout(55000),
      cache: "no-store",
    });
    if (!upstream.ok) {
      if (upstream.status === 429) return NextResponse.json({ error: "Mistral is rate-limiting requests. Wait a moment and try again." }, { status: 429 });
      if (upstream.status === 401 || upstream.status === 403) return NextResponse.json({ error: "Mistral rejected the configured API key. Check MISTRAL_API_KEY." }, { status: 502 });
      return NextResponse.json({ error: "Mistral could not complete this request. Try again shortly." }, { status: 502 });
    }
    const data = await upstream.json();
    const content = data?.choices?.[0]?.message?.content;
    const answer = typeof content === "string" ? content
      : Array.isArray(content) ? content.map((part: { text?: string }) => part?.text || "").join("") : "";
    if (!answer) return NextResponse.json({ error: "Mistral returned an empty response. Try again." }, { status: 502 });
    return NextResponse.json({
      message: { role: "assistant", content: answer },
      model: data.model || process.env.MISTRAL_MODEL || "mistral-large-latest",
      usage: data.usage || null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const timedOut = error instanceof Error && error.name === "TimeoutError";
    return NextResponse.json({
      error: timedOut ? "Mistral took too long to respond. Try a shorter prompt." : "Could not reach Mistral. Check the server connection and try again.",
    }, { status: 504 });
  }
}