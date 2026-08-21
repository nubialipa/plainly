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
  const textareaRef = useRef(null);

  async function handleProcess() {
    const text = input.trim();
    if (!text) {
      textareaRef.current?.focus();
      return;
    }
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

      setOutputLabel(
        mode === "simplify"
          ? "Plain version"
          : mode === "translate"
          ? `In ${lang}`
          : "Explained"
      );
      setOutput(data.text);
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
              <button className="copy-btn" onClick={copyOutput}>
                Copy
              </button>
            </div>
            <div className="output-card">
              <div key={sweepKey} className="sweep animate"></div>
              <div className="output-text">
                <FormattedOutput text={output} />
              </div>
            </div>
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
