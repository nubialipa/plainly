// Uses the Google Gemini API free tier (Gemini 2.5 Flash).
// Create an API key at https://aistudio.google.com/apikey
const GEMINI_MODEL = "gemini-3.6-flash";

const VALID_MODES = ["simplify", "translate", "explain"];
const VALID_LEVELS = ["simple", "very_simple"];
const VALID_LANGS = [
  "English",
  "Indonesian",
  "Spanish",
  "French",
  "Mandarin Chinese",
  "Arabic",
  "Japanese",
];

// The prompt/system-instruction logic lives ONLY on the server.
// The browser can never send or override the system prompt directly —
// it only picks from a fixed, validated set of mode/level/lang options.
function buildPrompt(mode, level, lang, text) {
  if (mode === "simplify") {
    const levelDesc =
      level === "very_simple"
        ? "Use very short sentences, everyday words a 10-year-old would know, and avoid all jargon. Aim for maximum simplicity even if it means splitting into multiple short sentences."
        : "Use clear, plain everyday language while keeping all essential meaning and important details.";
    return {
      system: `You rewrite complex, formal, or bureaucratic text into plain, easy-to-understand language. ${levelDesc}

Critical rule: never change the actual meaning. You must preserve, exactly as given, every: number, amount, date, deadline, obligation ("must", "shall", "required to"), prohibition ("must not", "cannot", "forbidden"), condition ("if... then..."), and named entity (people, organizations, article/clause references). Simplify the sentence structure and vocabulary around these facts, never the facts themselves. If something is ambiguous in the original, keep it just as ambiguous rather than guessing.

Keep the same language the input is written in (do not translate). Do not add commentary, headers, warnings, or explanations — output ONLY the rewritten plain-language text.`,
      user: text,
    };
  }
  if (mode === "translate") {
    return {
      system: `You translate text into ${lang}, in clear, natural, plain language (not overly formal or literal). Output ONLY the translation, nothing else.`,
      user: text,
    };
  }
  return {
    system:
      "You explain confusing, technical, legal, or jargon-heavy text so an average person understands it. Identify the hard terms or confusing parts and explain them simply, then give a one-line plain-language summary of what the whole passage means. Keep it concise. Respond in the same language as the input.",
    user: text,
  };
}

export async function POST(request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Server is missing GEMINI_API_KEY. Set it in your Vercel project's Environment Variables." },
      { status: 500 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { mode, level, lang, text } = body || {};

  if (!VALID_MODES.includes(mode)) {
    return Response.json({ error: "Invalid or missing 'mode'." }, { status: 400 });
  }
  if (mode === "simplify" && level && !VALID_LEVELS.includes(level)) {
    return Response.json({ error: "Invalid 'level'." }, { status: 400 });
  }
  if (mode === "translate" && lang && !VALID_LANGS.includes(lang)) {
    return Response.json({ error: "Invalid 'lang'." }, { status: 400 });
  }
  if (!text || typeof text !== "string" || !text.trim()) {
    return Response.json({ error: "Missing 'text'." }, { status: 400 });
  }
  if (text.length > 20000) {
    return Response.json({ error: "Text is too long. Please shorten it." }, { status: 400 });
  }

  const { system, user } = buildPrompt(mode, level, lang, text.trim());

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const payload = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { maxOutputTokens: 4000 },
  });

  // Gemini's free tier occasionally returns 503 (overloaded) or 429 (rate
  // limited). Both are transient, so retry a couple of times with a short
  // backoff before giving up — a demo shouldn't fail on a blip.
  const MAX_ATTEMPTS = 3;
  let lastStatus = null;

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
      });

      if (res.ok) {
        const data = await res.json();
        const resultText = (data.candidates?.[0]?.content?.parts || [])
          .map((p) => p.text || "")
          .join("\n")
          .trim();

        if (!resultText) {
          return Response.json(
            { error: "The AI returned an empty response. Try rephrasing or shortening the text." },
            { status: 502 }
          );
        }

        return Response.json({ text: resultText });
      }

      lastStatus = res.status;
      const errText = await res.text();
      console.error(`[plainly] Gemini API error ${res.status} (attempt ${attempt}/${MAX_ATTEMPTS}):`, errText);

      const isTransient = res.status === 503 || res.status === 429 || res.status >= 500;
      if (!isTransient || attempt === MAX_ATTEMPTS) break;

      // Wait a bit longer between each attempt: 600ms, then 1400ms.
      await new Promise((r) => setTimeout(r, attempt === 1 ? 600 : 1400));
    }

    const message =
      lastStatus === 503 || lastStatus === 429
        ? "The AI service is busy right now. Please try again in a few seconds."
        : "The AI service is temporarily unavailable. Please try again in a moment.";

    return Response.json({ error: message }, { status: 502 });
  } catch (err) {
    console.error("[plainly] Unexpected server error:", err);
    return Response.json({ error: "Something went wrong on our end. Please try again." }, { status: 500 });
  }
}
