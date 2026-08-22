"use client";

import { useState, useRef } from "react";

const EXAMPLES = {
  legal:
    "Permohonan yang tidak memenuhi persyaratan administratif sebagaimana dimaksud pada Pasal 7 ayat (2) dinyatakan tidak dapat diproses dan akan dikembalikan kepada pemohon disertai dengan alasan penolakan secara tertulis.",
  medical:
    "Patient presents with idiopathic bilateral lower extremity edema, non-pitting in nature, with no evidence of deep vein thrombosis on Doppler ultrasonography. Recommend conservative management and follow-up in 4 weeks.",
  contract:
    "The Lessee shall indemnify and hold harmless the Lessor from and against any and all claims, damages, losses, and expenses arising out of or resulting from the Lessee's failure to comply with the terms stipulated herein.",
};

const LANGUAGES = [
  "English",
  "Indonesian",
  "Spanish",
  "French",
  "Mandarin Chinese",
  "Arabic",
  "Japanese",
];

// Renders the light markdown the model tends to produce (headings, bold,
// bullets, dividers) without pulling in a markdown library.
function renderInline(line, keyPrefix) {
  // Split on **bold** and render those segments as <strong>.
  const parts = line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    )
  );
}

function FormattedOutput({ text }) {
  const lines = text.split("\n");
  const blocks = [];
  let bullets = [];

  const flushBullets = () => {
    if (bullets.length) {
      blocks.push(
        <ul className="md-list" key={`ul-${blocks.length}`}>
          {bullets.map((b, i) => (
            <li key={i}>{renderInline(b, `li-${blocks.length}-${i}`)}</li>
          ))}
        </ul>
      );
      bullets = [];
    }
  };

  lines.forEach((raw, idx) => {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (/^[-*]\s+/.test(trimmed)) {
      bullets.push(trimmed.replace(/^[-*]\s+/, ""));
      return;
    }
    flushBullets();

    if (!trimmed) return;

    if (/^-{3,}$/.test(trimmed)) {
      blocks.push(<hr className="md-rule" key={`hr-${idx}`} />);
      return;
    }
    const heading = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (heading) {
      blocks.push(
        <h3 className="md-heading" key={`h-${idx}`}>
          {renderInline(heading[2], `h-${idx}`)}
        </h3>
      );
      return;
    }
    blocks.push(
      <p className="md-p" key={`p-${idx}`}>
        {renderInline(trimmed, `p-${idx}`)}
      </p>
    );
  });

  flushBullets();
  return <>{blocks}</>;
}

// Text pasted from a web page carries navigation, ad blocks, and duplicated
// caption lines. This strips the obvious noise so Highlight mode shows the
// document rather than the page furniture. Deliberately conservative: it only
// removes lines it is confident about, and never edits the words themselves.
const NOISE_PATTERNS = [
  /^bersponsor$/i,
  /^sponsored$/i,
  /^call to action icon$/i,
  /^advertisement$/i,
  /^iklan$/i,
  /^konten bersponsor$/i,
  /^baca juga:?/i,
  /^lihat juga:?/i,
  /^read more:?/i,
  /^share$/i,
  /^bagikan$/i,
  /^lewati ke (konten|footer)/i,
  /^skip to /i,
  /^\d+(\.\d+)?k? (pengikut|followers)$/i,
  /^(kunjungi|visit) /i,
  /^(umpan balik|feedback|foto profil)$/i,
  /^cerita dari /i,
  /^expand article/i,
  /^lanjutkan membaca$/i,
];

function looksLikeNoise(line) {
  const t = line.trim();
  if (!t) return false;
  if (NOISE_PATTERNS.some((re) => re.test(t))) return true;
  // Bare domain lines left behind by ad blocks, e.g. "hostinger.com".
  if (/^[a-z0-9-]+\.(com|net|id|org|ai|co)(\s*·?)?$/i.test(t)) return true;
  // A lone punctuation mark or bullet.
  if (/^[·•—–-]$/.test(t)) return true;
  return false;
}

function cleanPastedText(raw) {
  const lines = raw.split("\n");
  const kept = [];
  let previous = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (looksLikeNoise(trimmed)) continue;

    // Web pages often repeat an image caption immediately after itself.
    if (trimmed && trimmed === previous) continue;

    kept.push(line);
    if (trimmed) previous = trimmed;
  }

  // Collapse runs of blank lines left behind by the removals.
  return kept
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Renders the original text with validated difficult phrases marked up.
// The text is never rewritten — segments are sliced from the original using
// server-verified positions, so what's on screen is always the user's own words.
function HighlightedText({ text, highlights, activeIndex, onSelect }) {
  const segments = [];
  let cursor = 0;

  highlights.forEach((h, i) => {
    if (h.start > cursor) {
      segments.push(
        <span key={`t-${i}`}>{text.slice(cursor, h.start)}</span>
      );
    }
    segments.push(
      <button
        key={`h-${i}`}
        className={`hl-mark ${activeIndex === i ? "active" : ""}`}
        onClick={() => onSelect(activeIndex === i ? null : i)}
        aria-expanded={activeIndex === i}
      >
        {text.slice(h.start, h.end)}
      </button>
    );
    cursor = h.end;
  });

  if (cursor < text.length) {
    segments.push(<span key="t-last">{text.slice(cursor)}</span>);
  }

  return <>{segments}</>;
}

export default function Home() {
  const [mode, setMode] = useState("simplify");
  const [level, setLevel] = useState("simple");
  const [lang, setLang] = useState("English");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [outputLabel, setOutputLabel] = useState("Plain version");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOutput, setShowOutput] = useState(false);
  const [sweepKey, setSweepKey] = useState(0);
  const [highlights, setHighlights] = useState([]);
  const [highlightedSource, setHighlightedSource] = useState("");
  const [activeHighlight, setActiveHighlight] = useState(null);
  const [cleanedChars, setCleanedChars] = useState(0);
  const textareaRef = useRef(null);

  async function handleProcess() {
    const raw = input.trim();
    if (!raw) {
      textareaRef.current?.focus();
      return;
    }

    // Strip page furniture before anything else, so both the AI and the
    // on-screen text work from the same cleaned document.
    const text = cleanPastedText(raw);
    if (!text) {
      setError("There's no readable text here once the page clutter is removed.");
      return;
    }
    setCleanedChars(raw.length - text.length);

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/plainly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, level, lang, text }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Request failed.");
      }

      if (mode === "highlight") {
        setHighlights(data.highlights || []);
        setHighlightedSource(text);
        setActiveHighlight(null);
        setOutputLabel("What makes this hard");
        setOutput("");
      } else {
        setHighlights([]);
        setOutputLabel(
          mode === "simplify"
            ? "Plain version"
            : mode === "translate"
            ? `In ${lang}`
            : "Explained"
        );
        setOutput(data.text);
      }

      setShowOutput(true);
      setSweepKey((k) => k + 1);
    } catch (err) {
      setError("Something went wrong: " + err.message + ". Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      handleProcess();
    }
  }

  function copyOutput() {
    navigator.clipboard.writeText(output);
  }

  return (
    <div className="wrap">
      <header>
        <div className="logo">
          <span className="logo-mark"></span>Plainly
        </div>
        <div className="tagline-small">say it plainly</div>
      </header>

      <div className="hero">
        <p className="eyebrow">Language, unblocked</p>
        <h1>
          Rumit itu bukan
          <br />
          <span className="mark">kesalahanmu.</span>
        </h1>
        <p className="sub">
          Plainly mengubah bahasa hukum, birokrasi, dan medis yang berbelit —
          jadi kalimat yang siapa saja bisa langsung mengerti.
        </p>
      </div>

      <div className="tool">
        <div className="mode-tabs">
          {[
            { id: "highlight", emoji: "🖍️", label: "Highlight" },
            { id: "simplify", emoji: "🧠", label: "Simplify" },
            { id: "translate", emoji: "🌐", label: "Translate" },
            { id: "explain", emoji: "🔎", label: "Explain" },
          ].map((m) => (
            <button
              key={m.id}
              className={`mode-tab ${mode === m.id ? "active" : ""}`}
              onClick={() => setMode(m.id)}
            >
              <span className="emoji">{m.emoji}</span> {m.label}
            </button>
          ))}
        </div>

        <div className="sub-controls">
          {mode === "simplify" && (
            <>
              <span>Level:</span>
              <div className="pill-select">
                <button
                  className={`pill-opt ${level === "simple" ? "active" : ""}`}
                  onClick={() => setLevel("simple")}
                >
                  Simple
                </button>
                <button
                  className={`pill-opt ${level === "very_simple" ? "active" : ""}`}
                  onClick={() => setLevel("very_simple")}
                >
                  Very simple
                </button>
              </div>
            </>
          )}
          {mode === "translate" && (
            <>
              <span>Into:</span>
              <select
                className="lang-select"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l} value={l}>
                    {l === "Indonesian" ? "Bahasa Indonesia" : l}
                  </option>
                ))}
              </select>
            </>
          )}
          {mode === "highlight" && (
            <span>Marks the hardest parts of your text — click any to see what it means.</span>
          )}
          {mode === "explain" && (
            <span>Explains jargon, acronyms & unfamiliar terms in plain words.</span>
          )}
        </div>

        <div className="panel">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Tempel kalimat rumit di sini... contoh: 'Permohonan yang tidak memenuhi persyaratan administratif sebagaimana dimaksud pada Pasal 7 ayat (2) dinyatakan tidak dapat diproses.'"
          />
          <div className="panel-footer">
            <span className="char-count">
              {input.length} character{input.length === 1 ? "" : "s"}
            </span>
            <button
              className="go-btn"
              onClick={handleProcess}
              disabled={loading}
            >
              {loading ? (
                <span className="spinner"></span>
              ) : (
                <span>Make it plain →</span>
              )}
            </button>
          </div>
        </div>

        <div className="examples">
          <span className="examples-label">Try:</span>
          {Object.entries(EXAMPLES).map(([key, text]) => (
            <button
              key={key}
              className="example-chip"
              onClick={() => setInput(text)}
            >
              {key === "legal"
                ? "Legal notice"
                : key === "medical"
                ? "Medical result"
                : "Rental clause"}
            </button>
          ))}
        </div>

        {error && <div className="error-box">{error}</div>}

        {showOutput && (
          <div className="output-wrap">
            <div className="output-label">
              {outputLabel}
              {cleanedChars > 40 && (
                <span className="cleaned-note">
                  {cleanedChars.toLocaleString()} chars of page clutter removed
                </span>
              )}
              {mode !== "highlight" && (
                <button className="copy-btn" onClick={copyOutput}>
                  Copy
                </button>
              )}
            </div>

            {mode === "highlight" ? (
              <>
                <div className="output-card">
                  <div key={sweepKey} className="sweep animate"></div>
                  <div className="output-text hl-source">
                    <HighlightedText
                      text={highlightedSource}
                      highlights={highlights}
                      activeIndex={activeHighlight}
                      onSelect={setActiveHighlight}
                    />
                  </div>
                </div>

                {activeHighlight !== null && highlights[activeHighlight] ? (
                  <div className="hl-panel">
                    <div className="hl-panel-term">
                      {highlights[activeHighlight].phrase}
                    </div>
                    <div className="hl-panel-body">
                      {highlights[activeHighlight].explanation}
                    </div>
                  </div>
                ) : (
                  <div className="hl-hint">
                    {highlights.length} difficult {highlights.length === 1 ? "term" : "terms"} found — tap one to see what it means.
                  </div>
                )}

                <button
                  className="hl-next-action"
                  onClick={() => {
                    setMode("simplify");
                    setShowOutput(false);
                  }}
                >
                  Simplify the whole passage →
                </button>
              </>
            ) : (
              <div className="output-card">
                <div key={sweepKey} className="sweep animate"></div>
                <div className="output-text">
                  <FormattedOutput text={output} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <footer>
        <span>Built for NeuralSprint · Descend</span>
        <span>MVP prototype</span>
      </footer>
    </div>
  );
}
