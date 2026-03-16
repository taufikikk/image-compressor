import { useState, useCallback } from "react";

const CHARSETS = [
  { key: "upper", label: "A-Z", chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
  { key: "lower", label: "a-z", chars: "abcdefghijklmnopqrstuvwxyz" },
  { key: "digits", label: "0-9", chars: "0123456789" },
  { key: "symbols", label: "!@#$%", chars: "!@#$%^&*()_+-=[]{}|;:,.<>?/" },
];

const WORDLIST = [
  "alpha","brave","cloud","delta","ember","frost","grain","haven","ivory","jewel",
  "knack","lunar","marsh","noble","ocean","plaza","quest","ridge","solar","thorn",
  "unity","vivid","wield","xenon","yield","zephyr","amber","blaze","coral","drift",
  "eagle","flame","ghost","haste","input","joker","karma","lotus","metro","nexus",
  "orbit","prism","quilt","rover","storm","tiger","ultra","vapor","whirl","xylem",
  "acorn","brisk","clamp","dwell","exalt","forge","gleam","hover","inlet","jumbo",
  "kiosk","latch","mango","nerve","oasis","pixel","quota","relay","spice","trove",
  "usher","valor","waltz","oxide","yacht","zilch","anvil","bloom","crest","dodge",
  "epoch","flora","grail","heron","ivory","joint","kneel","llama","mocha","nifty",
  "onion","plumb","quirk","roost","shrub","twirl","umbra","vault","wrist","axiom",
];

const labelStyle = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 12, fontWeight: 600, color: "#a1a1aa",
  letterSpacing: "0.03em",
};

const btnBase = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 13, fontWeight: 600,
  border: "none", borderRadius: 8,
  cursor: "pointer", transition: "all 0.15s",
  padding: "10px 18px",
};

function getCharColor(ch) {
  if (/[A-Z]/.test(ch)) return "#60a5fa";
  if (/[a-z]/.test(ch)) return "#a5b4fc";
  if (/[0-9]/.test(ch)) return "#4ade80";
  return "#fbbf24";
}

function calcEntropy(length, poolSize) {
  if (poolSize <= 0 || length <= 0) return 0;
  return length * Math.log2(poolSize);
}

function calcPassphraseEntropy(wordCount) {
  return wordCount * Math.log2(WORDLIST.length);
}

function getStrength(entropy) {
  if (entropy < 30) return { label: "Sangat Lemah", color: "#ef4444", pct: 10 };
  if (entropy < 50) return { label: "Lemah", color: "#f97316", pct: 25 };
  if (entropy < 70) return { label: "Sedang", color: "#eab308", pct: 50 };
  if (entropy < 90) return { label: "Kuat", color: "#22c55e", pct: 75 };
  return { label: "Sangat Kuat", color: "#10b981", pct: 100 };
}

function getCrackTime(entropy) {
  // Assume 10 billion guesses/sec (modern GPU cluster)
  const guessesPerSec = 1e10;
  const totalGuesses = Math.pow(2, entropy);
  const seconds = totalGuesses / guessesPerSec / 2; // average = half

  if (seconds < 0.001) return "Instan";
  if (seconds < 1) return `${(seconds * 1000).toFixed(0)} ms`;
  if (seconds < 60) return `${seconds.toFixed(1)} detik`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} menit`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} jam`;
  if (seconds < 31536000) return `${(seconds / 86400).toFixed(0)} hari`;
  if (seconds < 31536000 * 1000) return `${(seconds / 31536000).toFixed(0)} tahun`;
  if (seconds < 31536000 * 1e6) return `${(seconds / 31536000 / 1000).toFixed(0)} ribu tahun`;
  if (seconds < 31536000 * 1e9) return `${(seconds / 31536000 / 1e6).toFixed(0)} juta tahun`;
  return `${(seconds / 31536000 / 1e9).toExponential(1)} miliar tahun`;
}

function generatePassword(length, enabledSets) {
  const pool = enabledSets.map((k) => CHARSETS.find((c) => c.key === k)?.chars || "").join("");
  if (!pool) return "";
  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (v) => pool[v % pool.length]).join("");
}

function generatePassphrase(wordCount, separator) {
  const arr = new Uint32Array(wordCount);
  crypto.getRandomValues(arr);
  return Array.from(arr, (v) => {
    const word = WORDLIST[v % WORDLIST.length];
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(separator);
}

export default function PasswordGenerator() {
  const [mode, setMode] = useState("password"); // password | passphrase
  const [length, setLength] = useState(20);
  const [wordCount, setWordCount] = useState(5);
  const [separator, setSeparator] = useState("-");
  const [charsets, setCharsets] = useState(["upper", "lower", "digits", "symbols"]);
  const [count, setCount] = useState(1);
  const [results, setResults] = useState([]);
  const [copiedIdx, setCopiedIdx] = useState(-1);

  function toggleCharset(key) {
    setCharsets((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      return next.length > 0 ? next : prev; // at least 1
    });
  }

  const generate = useCallback(() => {
    const passwords = [];
    for (let i = 0; i < count; i++) {
      if (mode === "passphrase") {
        passwords.push(generatePassphrase(wordCount, separator));
      } else {
        passwords.push(generatePassword(length, charsets));
      }
    }
    setResults(passwords);
    setCopiedIdx(-1);
  }, [mode, length, wordCount, separator, charsets, count]);

  function copyOne(idx) {
    navigator.clipboard.writeText(results[idx]);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(-1), 2000);
  }

  function copyAll() {
    navigator.clipboard.writeText(results.join("\n"));
    setCopiedIdx(-2); // special: all
    setTimeout(() => setCopiedIdx(-1), 2000);
  }

  // Entropy calc
  let entropy;
  if (mode === "passphrase") {
    entropy = calcPassphraseEntropy(wordCount);
  } else {
    const poolSize = charsets.reduce((sum, k) => sum + (CHARSETS.find((c) => c.key === k)?.chars.length || 0), 0);
    entropy = calcEntropy(length, poolSize);
  }
  const strength = getStrength(entropy);
  const crackTime = getCrackTime(entropy);

  return (
    <div style={{ padding: "32px 36px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 22, fontWeight: 700,
          background: "linear-gradient(135deg, #6366f1, #a78bfa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 6,
        }}>Password Generator</h1>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13, color: "#52525b",
        }}>Generate password & passphrase yang kuat secara acak. 100% di browser.</p>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Controls */}
        <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* Mode */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Mode</div>
            <div style={{ display: "flex", gap: 6 }}>
              {[{ key: "password", label: "Password" }, { key: "passphrase", label: "Passphrase" }].map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  style={{
                    ...btnBase, flex: 1, fontSize: 12,
                    background: mode === m.key ? "rgba(99,102,241,0.15)" : "rgba(24,24,27,0.6)",
                    color: mode === m.key ? "#a5b4fc" : "#a1a1aa",
                    border: mode === m.key ? "1px solid rgba(99,102,241,0.3)" : "1px solid #27272a",
                  }}
                >{m.label}</button>
              ))}
            </div>
          </div>

          {mode === "password" ? (
            <>
              {/* Length slider */}
              <div>
                <div style={{ ...labelStyle, marginBottom: 8 }}>
                  Panjang: <span style={{ color: "#a5b4fc", fontFamily: "'JetBrains Mono', monospace" }}>{length}</span>
                </div>
                <input
                  type="range" min={4} max={128} value={length}
                  onChange={(e) => setLength(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "#6366f1" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#3f3f46" }}>
                  <span>4</span><span>128</span>
                </div>
              </div>

              {/* Charsets */}
              <div>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Karakter</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {CHARSETS.map((cs) => {
                    const on = charsets.includes(cs.key);
                    return (
                      <button
                        key={cs.key}
                        onClick={() => toggleCharset(cs.key)}
                        style={{
                          ...btnBase, fontSize: 12, padding: "8px 14px",
                          background: on ? "rgba(99,102,241,0.15)" : "rgba(24,24,27,0.6)",
                          color: on ? "#a5b4fc" : "#52525b",
                          border: on ? "1px solid rgba(99,102,241,0.3)" : "1px solid #27272a",
                          textDecoration: on ? "none" : "line-through",
                        }}
                      >{cs.label}</button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Word count */}
              <div>
                <div style={{ ...labelStyle, marginBottom: 8 }}>
                  Jumlah kata: <span style={{ color: "#a5b4fc", fontFamily: "'JetBrains Mono', monospace" }}>{wordCount}</span>
                </div>
                <input
                  type="range" min={3} max={12} value={wordCount}
                  onChange={(e) => setWordCount(parseInt(e.target.value))}
                  style={{ width: "100%", accentColor: "#6366f1" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#3f3f46" }}>
                  <span>3</span><span>12</span>
                </div>
              </div>

              {/* Separator */}
              <div>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Separator</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["-", ".", "_", " ", ""].map((s) => (
                    <button
                      key={s}
                      onClick={() => setSeparator(s)}
                      style={{
                        ...btnBase, fontSize: 12, padding: "8px 14px", minWidth: 42,
                        background: separator === s ? "rgba(99,102,241,0.15)" : "rgba(24,24,27,0.6)",
                        color: separator === s ? "#a5b4fc" : "#a1a1aa",
                        border: separator === s ? "1px solid rgba(99,102,241,0.3)" : "1px solid #27272a",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >{s === "" ? "none" : s === " " ? "space" : `"${s}"`}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Count */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 8 }}>
              Jumlah generate: <span style={{ color: "#a5b4fc", fontFamily: "'JetBrains Mono', monospace" }}>{count}</span>
            </div>
            <input
              type="range" min={1} max={20} value={count}
              onChange={(e) => setCount(parseInt(e.target.value))}
              style={{ width: "100%", accentColor: "#6366f1" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#3f3f46" }}>
              <span>1</span><span>20</span>
            </div>
          </div>

          {/* Strength indicator */}
          <div style={{
            padding: "16px 18px", borderRadius: 10,
            background: "rgba(24,24,27,0.5)", border: "1px solid #27272a",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={labelStyle}>Kekuatan</div>
              <div style={{
                fontSize: 13, fontWeight: 700, color: strength.color,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>{strength.label}</div>
            </div>
            {/* Bar */}
            <div style={{
              height: 6, borderRadius: 3,
              background: "#1e1e2a", overflow: "hidden", marginBottom: 10,
            }}>
              <div style={{
                height: "100%", borderRadius: 3,
                width: `${strength.pct}%`,
                background: strength.color,
                transition: "all 0.3s ease",
              }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
              <span style={{ color: "#52525b" }}>
                Entropy: <span style={{ color: "#a1a1aa", fontFamily: "'JetBrains Mono', monospace" }}>{Math.round(entropy)} bits</span>
              </span>
              <span style={{ color: "#52525b" }}>
                Crack: <span style={{ color: "#a1a1aa", fontFamily: "'JetBrains Mono', monospace" }}>{crackTime}</span>
              </span>
            </div>
            <div style={{ fontSize: 9, color: "#3f3f46", marginTop: 6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              *Estimasi berdasarkan 10 miliar percobaan/detik (GPU cluster)
            </div>
          </div>

          {/* Generate button */}
          <button
            onClick={generate}
            style={{
              ...btnBase,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
              padding: "14px 24px", fontSize: 14,
            }}
          >Generate</button>
        </div>

        {/* Results */}
        <div style={{ flex: "1 1 380px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={labelStyle}>Hasil {results.length > 0 ? `(${results.length})` : ""}</div>
            {results.length > 1 && (
              <button onClick={copyAll} style={{
                ...btnBase, fontSize: 11, padding: "4px 10px",
                background: copiedIdx === -2 ? "rgba(34,197,94,0.15)" : "rgba(24,24,27,0.6)",
                color: copiedIdx === -2 ? "#4ade80" : "#a1a1aa",
                border: copiedIdx === -2 ? "1px solid rgba(34,197,94,0.3)" : "1px solid #27272a",
              }}>{copiedIdx === -2 ? "Copied All!" : "Copy All"}</button>
            )}
          </div>

          {results.length === 0 ? (
            <div style={{
              padding: "48px 24px", borderRadius: 12,
              background: "rgba(24,24,27,0.5)", border: "1px solid #27272a",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🔑</div>
              <div style={{
                fontSize: 13, color: "#3f3f46",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>Klik Generate untuk membuat password</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {results.map((pw, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 16px", borderRadius: 10,
                  background: "rgba(24,24,27,0.5)", border: "1px solid #27272a",
                  transition: "border-color 0.15s",
                }}>
                  {/* Number badge */}
                  {results.length > 1 && (
                    <div style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: "rgba(99,102,241,0.12)", color: "#6366f1",
                      fontSize: 10, fontWeight: 700,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                    }}>{i + 1}</div>
                  )}
                  {/* Color-coded password */}
                  <div style={{
                    flex: 1, fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14, lineHeight: 1.5,
                    wordBreak: "break-all", letterSpacing: "0.03em",
                  }}>
                    {mode === "password" ? (
                      pw.split("").map((ch, j) => (
                        <span key={j} style={{ color: getCharColor(ch) }}>{ch}</span>
                      ))
                    ) : (
                      <span style={{ color: "#a5b4fc" }}>{pw}</span>
                    )}
                  </div>
                  {/* Copy button */}
                  <button
                    onClick={() => copyOne(i)}
                    style={{
                      ...btnBase, fontSize: 11, padding: "6px 12px", flexShrink: 0,
                      background: copiedIdx === i ? "rgba(34,197,94,0.15)" : "rgba(24,24,27,0.8)",
                      color: copiedIdx === i ? "#4ade80" : "#a1a1aa",
                      border: copiedIdx === i ? "1px solid rgba(34,197,94,0.3)" : "1px solid #27272a",
                    }}
                  >{copiedIdx === i ? "Copied!" : "Copy"}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
