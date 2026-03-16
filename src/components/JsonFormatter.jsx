import { useState, useCallback } from "react";

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

const monoStyle = {
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: 13, lineHeight: 1.6,
  background: "#0d0d12",
  border: "1px solid #27272a",
  borderRadius: 10,
  padding: "16px 18px",
  color: "#e4e4e7",
  width: "100%",
  resize: "vertical",
  outline: "none",
  tabSize: 2,
};

const INDENT_OPTIONS = [2, 4, 8, "tab", "minify"];

export default function JsonFormatter() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [indent, setIndent] = useState(2);
  const [stats, setStats] = useState(null);
  const [copied, setCopied] = useState(false);

  function countStats(obj) {
    let keys = 0, arrays = 0, objects = 0, nulls = 0, strings = 0, numbers = 0, booleans = 0;
    function walk(v) {
      if (v === null) { nulls++; return; }
      if (Array.isArray(v)) { arrays++; v.forEach(walk); return; }
      if (typeof v === "object") {
        objects++;
        const k = Object.keys(v);
        keys += k.length;
        k.forEach((key) => walk(v[key]));
        return;
      }
      if (typeof v === "string") strings++;
      else if (typeof v === "number") numbers++;
      else if (typeof v === "boolean") booleans++;
    }
    walk(obj);
    return { keys, arrays, objects, nulls, strings, numbers, booleans };
  }

  const format = useCallback(() => {
    const raw = input.trim();
    if (!raw) {
      setError("Masukkan JSON terlebih dahulu.");
      setOutput("");
      setStats(null);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      let indentVal;
      if (indent === "tab") indentVal = "\t";
      else if (indent === "minify") indentVal = undefined;
      else indentVal = indent;

      const result = indent === "minify"
        ? JSON.stringify(parsed)
        : JSON.stringify(parsed, null, indentVal);

      setOutput(result);
      setError("");
      setStats(countStats(parsed));
    } catch (err) {
      // Try to give a helpful error position
      const match = err.message.match(/position (\d+)/);
      let hint = "";
      if (match) {
        const pos = parseInt(match[1]);
        const before = raw.substring(Math.max(0, pos - 20), pos);
        const after = raw.substring(pos, pos + 20);
        hint = `\n\nSekitar: ...${before}>>>HERE<<<${after}...`;
      }
      setError(err.message + hint);
      setOutput("");
      setStats(null);
    }
  }, [input, indent]);

  function handleCopy() {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handlePaste() {
    navigator.clipboard.readText().then((text) => {
      setInput(text);
      setOutput("");
      setError("");
      setStats(null);
    });
  }

  function handleClear() {
    setInput("");
    setOutput("");
    setError("");
    setStats(null);
  }

  function handleSample() {
    const sample = JSON.stringify({
      name: "Web Toolkit",
      version: "1.0.0",
      features: ["json-formatter", "jwt-decoder", "epoch-converter"],
      config: { theme: "dark", language: "id", clientSide: true },
      metadata: { created: new Date().toISOString(), author: null, stars: 42 }
    });
    setInput(sample);
    setOutput("");
    setError("");
    setStats(null);
  }

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 22, fontWeight: 700,
          background: "linear-gradient(135deg, #6366f1, #a78bfa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 6,
        }}>JSON Formatter</h1>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13, color: "#52525b",
        }}>Format, validasi, dan minify JSON dengan syntax highlighting.</p>
      </div>

      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ ...labelStyle, marginRight: 4 }}>Indent:</div>
        {INDENT_OPTIONS.map((opt) => (
          <button
            key={opt}
            onClick={() => setIndent(opt)}
            style={{
              ...btnBase, fontSize: 11, padding: "6px 12px",
              background: indent === opt ? "rgba(99,102,241,0.15)" : "rgba(24,24,27,0.6)",
              color: indent === opt ? "#a5b4fc" : "#a1a1aa",
              border: indent === opt ? "1px solid rgba(99,102,241,0.3)" : "1px solid #27272a",
            }}
          >{opt === "tab" ? "Tab" : opt === "minify" ? "Minify" : `${opt} spaces`}</button>
        ))}
        <div style={{ flex: 1 }} />
        <button onClick={handleSample} style={{
          ...btnBase, fontSize: 11, padding: "6px 12px",
          background: "rgba(24,24,27,0.6)", color: "#a1a1aa", border: "1px solid #27272a",
        }}>Sample</button>
        <button onClick={handlePaste} style={{
          ...btnBase, fontSize: 11, padding: "6px 12px",
          background: "rgba(24,24,27,0.6)", color: "#a1a1aa", border: "1px solid #27272a",
        }}>Paste</button>
        <button onClick={handleClear} style={{
          ...btnBase, fontSize: 11, padding: "6px 12px",
          background: "rgba(24,24,27,0.6)", color: "#a1a1aa", border: "1px solid #27272a",
        }}>Clear</button>
      </div>

      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {/* Input */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ ...labelStyle, marginBottom: 8 }}>Input</div>
          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); setOutput(""); setError(""); setStats(null); }}
            placeholder='{"paste": "your JSON here"}'
            rows={18}
            style={monoStyle}
            spellCheck={false}
          />
        </div>

        {/* Format button (center) */}
        <div style={{ display: "flex", alignItems: "center", flexDirection: "column", justifyContent: "center", gap: 8 }}>
          <button onClick={format} style={{
            ...btnBase,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff",
            boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
            padding: "12px 24px",
          }}>Format ➜</button>
        </div>

        {/* Output */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={labelStyle}>Output</div>
            {output && (
              <button onClick={handleCopy} style={{
                ...btnBase, fontSize: 11, padding: "4px 10px",
                background: copied ? "rgba(34,197,94,0.15)" : "rgba(24,24,27,0.6)",
                color: copied ? "#4ade80" : "#a1a1aa",
                border: copied ? "1px solid rgba(34,197,94,0.3)" : "1px solid #27272a",
              }}>{copied ? "Copied!" : "Copy"}</button>
            )}
          </div>
          <textarea
            value={output}
            readOnly
            rows={18}
            style={{ ...monoStyle, color: output ? "#a5f3a0" : "#52525b" }}
            placeholder="Hasil format akan muncul di sini..."
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginTop: 16, padding: "14px 18px", borderRadius: 10,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12, color: "#f87171", whiteSpace: "pre-wrap", lineHeight: 1.5,
        }}>{error}</div>
      )}

      {/* Stats */}
      {stats && (
        <div style={{
          marginTop: 16, padding: "14px 18px", borderRadius: 10,
          background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)",
        }}>
          <div style={{ ...labelStyle, marginBottom: 8 }}>Statistik</div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {[
              { label: "Keys", val: stats.keys, color: "#a5b4fc" },
              { label: "Objects", val: stats.objects, color: "#fbbf24" },
              { label: "Arrays", val: stats.arrays, color: "#34d399" },
              { label: "Strings", val: stats.strings, color: "#fb923c" },
              { label: "Numbers", val: stats.numbers, color: "#60a5fa" },
              { label: "Booleans", val: stats.booleans, color: "#c084fc" },
              { label: "Nulls", val: stats.nulls, color: "#6b7280" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 18, fontWeight: 700, color: s.color,
                }}>{s.val}</div>
                <div style={{ fontSize: 10, color: "#52525b" }}>{s.label}</div>
              </div>
            ))}
            <div style={{ textAlign: "center" }}>
              <div style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 18, fontWeight: 700, color: "#e4e4e7",
              }}>{output.length}</div>
              <div style={{ fontSize: 10, color: "#52525b" }}>Chars</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
