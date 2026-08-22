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

// Matches the server-side cap in /api/plainly. Kept visible in the UI so people
// find out before they press the button, not after.
const MAX_CHARS = 20000;

// value = what the API is told; label = what the user sees.
const LANGUAGES = [
  { value: "English", label: "English" },
  { value: "Indonesian", label: "Bahasa Indonesia" },
  { value: "Arabic", label: "العربية" },
  { value: "German", label: "Deutsch" },
  { value: "Spanish", label: "Español" },
  { value: "French", label: "Français" },
  { value: "Chinese (Simplified)", label: "简体中文" },
  { value: "Chinese (Traditional)", label: "繁體中文" },
  { value: "Japanese", label: "日本語" },
  { value: "Korean", label: "한국어" },
];

// Interface copy. Plainly is about removing language barriers, so the interface
// itself shouldn't impose one.
const UI = {
  en: {
    eyebrow: "Language, unblocked",
    headlineA: "Complicated isn't",
    headlineB: "your fault.",
    sub: "Plainly turns tangled legal, bureaucratic, and medical language into sentences anyone can understand.",
    modeHighlight: "Highlight",
    modeSimplify: "Simplify",
    modeTranslate: "Translate",
    modeExplain: "Explain",
    hintHighlight: "Marks the hardest parts of your text — click any to see what it means.",
    hintExplain: "Explains jargon, acronyms & unfamiliar terms in plain words.",
    levelLabel: "Level:",
    levelSimple: "Simple",
    levelVerySimple: "Very simple",
    intoLabel: "Into:",
    placeholder: "Paste complicated text here… for example a contract clause, an official letter, or a medical result.",
    characters: "characters",
    words: "words",
    overLimit: (n) => `${n} over the limit — trim it to continue`,
    nearLimit: "approaching the limit",
    action: "Make it plain →",
    tryLabel: "Try:",
    exLegal: "Legal notice",
    exMedical: "Medical result",
    exContract: "Rental clause",
    labelPlain: "Plain version",
    labelExplained: "Explained",
    labelHighlight: "What makes this hard",
    labelIn: (l) => `In ${l}`,
    copy: "Copy",
    clutter: (n) => `${n} chars of page clutter removed`,
    foundOne: "1 difficult term found — tap it to see what it means.",
    foundMany: (n) => `${n} difficult terms found — tap one to see what it means.`,
    nextAction: "Simplify the whole passage →",
    emptyAfterClean: "There's no readable text here once the page clutter is removed.",
    genericError: "Something went wrong: ",
    tagline: "say it plainly",
    footerLeft: "Built for NeuralSprint · Descend",
    footerRight: "MVP prototype",
  },
  id: {
    eyebrow: "Bahasa, tanpa penghalang",
    headlineA: "Rumit itu bukan",
    headlineB: "kesalahanmu.",
    sub: "Plainly mengubah bahasa hukum, birokrasi, dan medis yang berbelit — jadi kalimat yang siapa saja bisa langsung mengerti.",
    modeHighlight: "Sorot",
    modeSimplify: "Sederhanakan",
    modeTranslate: "Terjemahkan",
    modeExplain: "Jelaskan",
    hintHighlight: "Menandai bagian tersulit dari teksmu — klik untuk melihat artinya.",
    hintExplain: "Menjelaskan jargon, singkatan, dan istilah asing dengan bahasa sederhana.",
    levelLabel: "Tingkat:",
    levelSimple: "Sederhana",
    levelVerySimple: "Sangat sederhana",
    intoLabel: "Ke:",
    placeholder: "Tempel teks rumit di sini… misalnya klausul kontrak, surat resmi, atau hasil pemeriksaan medis.",
    characters: "karakter",
    words: "kata",
    overLimit: (n) => `${n} melebihi batas — kurangi untuk melanjutkan`,
    nearLimit: "mendekati batas",
    action: "Buat jadi jelas →",
    tryLabel: "Coba:",
    exLegal: "Surat resmi",
    exMedical: "Hasil medis",
    exContract: "Klausul sewa",
    labelPlain: "Versi sederhana",
    labelExplained: "Penjelasan",
    labelHighlight: "Yang membuat ini sulit",
    labelIn: (l) => `Dalam ${l}`,
    copy: "Salin",
    clutter: (n) => `${n} karakter sampah halaman dibuang`,
    foundOne: "1 istilah sulit ditemukan — ketuk untuk melihat artinya.",
    foundMany: (n) => `${n} istilah sulit ditemukan — ketuk salah satu untuk melihat artinya.`,
    nextAction: "Sederhanakan seluruh teks →",
    emptyAfterClean: "Tidak ada teks yang bisa dibaca setelah sampah halaman dibuang.",
    genericError: "Terjadi kesalahan: ",
    tagline: "say it plainly",
    footerLeft: "Dibuat untuk NeuralSprint · Descend",
    footerRight: "Prototipe MVP",
  },
};

// Mode icons. Drawn rather than using emoji, which render differently on every
// platform and were the one inconsistent element in the interface.
const ICONS = {
  highlight: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 14.5 12.5 6l2.5 2.5L6.5 17H4v-2.5Z" fill="currentColor" opacity="0.18" />
      <path d="M4 14.5 12.5 6l2.5 2.5L6.5 17H4v-2.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="m12.5 6 1.75-1.75a1.5 1.5 0 0 1 2.12 0l.38.38a1.5 1.5 0 0 1 0 2.12L15 8.5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  ),
  simplify: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M3 5h14M3 10h9M3 15h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  translate: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 10h14M10 3c1.8 2 2.7 4.4 2.7 7S11.8 15 10 17c-1.8-2-2.7-4.4-2.7-7S8.2 5 10 3Z" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  ),
  explain: (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="m13.5 13.5 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M9 11.2V11c0-.7.4-1.1.9-1.5.5-.4.8-.7.8-1.2a1.7 1.7 0 0 0-3.4 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="9" cy="13.2" r="0.6" fill="currentColor" />
    </svg>
  ),
};

// Logo mark: a document with one line struck through by a highlighter.
// Vector so it stays crisp at any size, and drawn with the same ink/highlighter
// palette as the rest of the interface.
function LogoMark() {
  return (
    <svg
      className="logo-mark"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* back sheet, slightly offset */}
      <rect
        x="9" y="3" width="19" height="24" rx="3"
        fill="var(--white)" stroke="var(--ink)" strokeWidth="1.6"
      />
      {/* front sheet */}
      <rect
        x="4" y="6" width="19" height="24" rx="3"
        fill="var(--white)" stroke="var(--ink)" strokeWidth="1.6"
      />
      {/* highlighter swipe across the middle line */}
      <rect
        x="6.5" y="15" width="14" height="5.5" rx="1"
        fill="var(--highlighter)"
      />
      {/* text lines */}
      <line x1="8" y1="11" x2="19" y2="11" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="8" y1="17.8" x2="17" y2="17.8" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
      <line x1="8" y1="24.5" x2="15" y2="24.5" stroke="var(--ink)" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

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
  const [resultMode, setResultMode] = useState("simplify");
  const [resultLang, setResultLang] = useState("English");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showOutput, setShowOutput] = useState(false);
  const [sweepKey, setSweepKey] = useState(0);
  const [highlights, setHighlights] = useState([]);
  const [highlightedSource, setHighlightedSource] = useState("");
  const [activeHighlight, setActiveHighlight] = useState(null);
  const [cleanedChars, setCleanedChars] = useState(0);
  const [uiLang, setUiLang] = useState("en");
  const t = UI[uiLang];
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
      setError(t.emptyAfterClean);
      return;
    }
    setCleanedChars(raw.length - text.length);

    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/plainly", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, level, lang, text, uiLang }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Request failed.");
      }

      setResultMode(mode);
      setResultLang(lang);

      if (mode === "highlight") {
        setHighlights(data.highlights || []);
        setHighlightedSource(text);
        setActiveHighlight(null);
        setOutput("");
      } else {
        setHighlights([]);
        setOutput(data.text);
      }

      setShowOutput(true);
      setSweepKey((k) => k + 1);
    } catch (err) {
      setError(t.genericError + err.message);
    } finally {
      setLoading(false);
    }
  }

  const wordCount = input.trim() ? input.trim().split(/\s+/).length : 0;
  const overLimit = input.length > MAX_CHARS;
  const nearLimit = !overLimit && input.length > MAX_CHARS * 0.9;

  const outputLabel =
    resultMode === "highlight"
      ? t.labelHighlight
      : resultMode === "simplify"
      ? t.labelPlain
      : resultMode === "translate"
      ? t.labelIn(LANGUAGES.find((l) => l.value === resultLang)?.label || resultLang)
      : t.labelExplained;

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
          <LogoMark />Plainly
        </div>
        <div className="header-right">
          <div className="ui-lang-toggle">
            <button
              className={`ui-lang-opt ${uiLang === "en" ? "active" : ""}`}
              onClick={() => setUiLang("en")}
              aria-pressed={uiLang === "en"}
            >
              EN
            </button>
            <button
              className={`ui-lang-opt ${uiLang === "id" ? "active" : ""}`}
              onClick={() => setUiLang("id")}
              aria-pressed={uiLang === "id"}
            >
              ID
            </button>
          </div>
        </div>
      </header>

      <div className="hero">
        <h1>
          {t.headlineA}
          <br />
          <span className="mark">{t.headlineB}</span>
        </h1>
        <p className="sub">{t.sub}</p>
      </div>

      <div className="tool">
        <div className="mode-tabs">
          {[
            { id: "highlight", label: t.modeHighlight },
            { id: "simplify", label: t.modeSimplify },
            { id: "translate", label: t.modeTranslate },
            { id: "explain", label: t.modeExplain },
          ].map((m) => (
            <button
              key={m.id}
              className={`mode-tab ${mode === m.id ? "active" : ""}`}
              onClick={() => setMode(m.id)}
            >
              <span className="mode-icon">{ICONS[m.id]}</span>
              {m.label}
            </button>
          ))}
        </div>

        <div className="sub-controls">
          {mode === "simplify" && (
            <>
              <span>{t.levelLabel}</span>
              <div className="pill-select">
                <button
                  className={`pill-opt ${level === "simple" ? "active" : ""}`}
                  onClick={() => setLevel("simple")}
                >
                  {t.levelSimple}
                </button>
                <button
                  className={`pill-opt ${level === "very_simple" ? "active" : ""}`}
                  onClick={() => setLevel("very_simple")}
                >
                  {t.levelVerySimple}
                </button>
              </div>
            </>
          )}
          {mode === "translate" && (
            <>
              <span>{t.intoLabel}</span>
              <select
                className="lang-select"
                value={lang}
                onChange={(e) => setLang(e.target.value)}
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </>
          )}
          {mode === "highlight" && <span>{t.hintHighlight}</span>}
          {mode === "explain" && <span>{t.hintExplain}</span>}
        </div>

        <div className="panel">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t.placeholder}
          />
          <div className="panel-footer">
            <span
              className={`char-count ${
                overLimit ? "over" : nearLimit ? "near" : ""
              }`}
            >
              {overLimit
                ? t.overLimit((input.length - MAX_CHARS).toLocaleString())
                : `${wordCount.toLocaleString()} ${t.words}`}
              {!overLimit && nearLimit && ` · ${t.nearLimit}`}
            </span>
            <button
              className="go-btn"
              onClick={handleProcess}
              disabled={loading || overLimit}
            >
              {loading ? (
                <span className="spinner"></span>
              ) : (
                <span>{t.action}</span>
              )}
            </button>
          </div>
        </div>

        <div className="examples">
          <span className="examples-label">{t.tryLabel}</span>
          {Object.entries(EXAMPLES).map(([key, text]) => (
            <button
              key={key}
              className="example-chip"
              onClick={() => setInput(text)}
            >
              {key === "legal"
                ? t.exLegal
                : key === "medical"
                ? t.exMedical
                : t.exContract}
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
                  {t.clutter(cleanedChars.toLocaleString())}
                </span>
              )}
              {resultMode !== "highlight" && (
                <button className="copy-btn" onClick={copyOutput}>
                  {t.copy}
                </button>
              )}
            </div>

            {resultMode === "highlight" ? (
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
                    {highlights.length === 1
                      ? t.foundOne
                      : t.foundMany(highlights.length)}
                  </div>
                )}

                <button
                  className="hl-next-action"
                  onClick={() => {
                    setMode("simplify");
                    setShowOutput(false);
                  }}
                >
                  {t.nextAction}
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
    </div>
  );
}
