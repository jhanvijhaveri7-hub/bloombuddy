const SYSTEM_PROMPT = `You are Buddy inside Bloom, a warm, emotionally intelligent wellbeing companion. Speak naturally like a thoughtful close friend, never like a worksheet or customer-support bot. Pay close attention to the recent conversation and respond specifically to what the user just said. Do not repeat the same response. Use everyday language and contractions. Usually answer in 1–4 short sentences. Sometimes simply listen, validate, gently joke, or ask one relevant follow-up. Never diagnose or claim to be a therapist. If there is credible self-harm or immediate-danger language, encourage immediate human help and local emergency or crisis support.`;

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
});

export default {
  async fetch(request) {
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) return json({ error: "Groq is not configured" }, 503);
    try {
      const body = await request.json();
      const message = String(body.message || "").trim();
      if (!message) return json({ error: "Message is required" }, 400);
      const history = Array.isArray(body.history) ? body.history.slice(-12).filter((item) => item && ["user", "assistant"].includes(item.role) && typeof item.content === "string").map((item) => ({ role: item.role, content: item.content.slice(0, 4000) })) : [];
      const context = [
        body.preferences ? `Things the user enjoys: ${String(body.preferences).slice(0, 1000)}` : "",
        body.avoid ? `Things the user prefers to avoid: ${String(body.avoid).slice(0, 1000)}` : "",
      ].filter(Boolean).join("\n");
      const messages = [{ role: "system", content: `${SYSTEM_PROMPT}${context ? `\n\n${context}` : ""}` }, ...history];
      const last = messages[messages.length - 1];
      if (!last || last.role !== "user" || last.content !== message) messages.push({ role: "user", content: message });
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: process.env.GROQ_MODEL || "openai/gpt-oss-120b", messages, temperature: 0.8, max_completion_tokens: 700 }),
      });
      const data = await response.json();
      if (!response.ok) return json({ error: "Groq request failed" }, 502);
      const reply = data?.choices?.[0]?.message?.content?.trim();
      if (!reply) return json({ error: "Groq returned an empty reply" }, 502);
      return json({ reply });
    } catch {
      return json({ error: "Buddy could not create a reply" }, 500);
    }
  },
};