import { useState } from "react";

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
};

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return JSON.parse(atob(base64));
}

function formatTimestamp(ts) {
  if (typeof ts !== "number") return null;
  const d = new Date(ts * 1000);
  const now = Date.now();
  const diff = ts * 1000 - now;
  const isExpired = diff < 0;
  const absDiff = Math.abs(diff);

  let relative;
  if (absDiff < 60000) relative = `${Math.round(absDiff / 1000)}s`;
  else if (absDiff < 3600000) relative = `${Math.round(absDiff / 60000)}m`;
  else if (absDiff < 86400000) relative = `${Math.round(absDiff / 3600000)}h`;
  else relative = `${Math.round(absDiff / 86400000)}d`;

  return {
    iso: d.toISOString(),
    local: d.toLocaleString("id-ID", { dateStyle: "full", timeStyle: "long" }),
    isExpired,
    relative: isExpired ? `${relative} ago (expired)` : `in ${relative}`,
  };
}

const TIME_FIELDS = { exp: "Expiration", iat: "Issued At", nbf: "Not Before", auth_time: "Auth Time" };

const SAMPLE_HEADER = { alg: "HS256", typ: "JWT" };
const SAMPLE_PAYLOAD = {
  sub: "1234567890",
  name: "John Doe",
  iat: Math.floor(Date.now() / 1000) - 3600,
  exp: Math.floor(Date.now() / 1000) + 3600,
};

function makeSampleJwt() {
  function b64url(obj) {
    return btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }
  return `${b64url(SAMPLE_HEADER)}.${b64url(SAMPLE_PAYLOAD)}.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`;
}

export default function JwtDecoder() {
  const [token, setToken] = useState("");
  const [header, setHeader] = useState(null);
  const [payload, setPayload] = useState(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  function decode(input) {
    const raw = (input ?? token).trim();
    if (!raw) {
      setError("Masukkan JWT token terlebih dahulu.");
      setHeader(null);
      setPayload(null);
      return;
    }

    const parts = raw.split(".");
    if (parts.length !== 3) {
      setError(`JWT harus memiliki 3 bagian (header.payload.signature), ditemukan ${parts.length} bagian.`);
      setHeader(null);
      setPayload(null);
      return;
    }

    try {
      const h = base64UrlDecode(parts[0]);
      const p = base64UrlDecode(parts[1]);
      setHeader(h);
      setPayload(p);
      setError("");
    } catch (err) {
      setError("Gagal decode JWT: " + err.message);
      setHeader(null);
      setPayload(null);
    }
  }

  function handleSample() {
    const jwt = makeSampleJwt();
    setToken(jwt);
    decode(jwt);
  }

  function handlePaste() {
    navigator.clipboard.readText().then((text) => {
      setToken(text);
      decode(text);
    });
  }

  function handleCopy(section) {
    const data = section === "header" ? header : payload;
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(section);
    setTimeout(() => setCopied(""), 2000);
  }

  function renderTimestamp(key, value) {
    const info = formatTimestamp(value);
    if (!info) return null;
    return (
      <div key={key} style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "8px 12px", borderRadius: 8,
        background: info.isExpired && key === "exp" ? "rgba(239,68,68,0.08)" : "rgba(99,102,241,0.06)",
        border: info.isExpired && key === "exp" ? "1px solid rgba(239,68,68,0.15)" : "1px solid rgba(99,102,241,0.1)",
        marginBottom: 6,
      }}>
        <div>
          <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {TIME_FIELDS[key] || key}
          </div>
          <div style={{ fontSize: 12, color: "#a1a1aa", fontFamily: "'JetBrains Mono', monospace" }}>
            {info.local}
          </div>
        </div>
        <div style={{
          fontSize: 11, fontWeight: 600,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: info.isExpired && key === "exp" ? "#f87171" : "#4ade80",
          textAlign: "right",
        }}>{info.relative}</div>
      </div>
    );
  }

  const tokenParts = token.trim().split(".");
  const hasThreeParts = tokenParts.length === 3 && tokenParts.every(p => p.length > 0);

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 22, fontWeight: 700,
          background: "linear-gradient(135deg, #6366f1, #a78bfa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 6,
        }}>JWT Decoder</h1>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13, color: "#52525b",
        }}>Decode dan inspeksi JWT token. Header, payload, dan timestamp otomatis terbaca.</p>
      </div>

      {/* Input */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div style={labelStyle}>JWT Token</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={handleSample} style={{
              ...btnBase, fontSize: 11, padding: "4px 10px",
              background: "rgba(24,24,27,0.6)", color: "#a1a1aa", border: "1px solid #27272a",
            }}>Sample</button>
            <button onClick={handlePaste} style={{
              ...btnBase, fontSize: 11, padding: "4px 10px",
              background: "rgba(24,24,27,0.6)", color: "#a1a1aa", border: "1px solid #27272a",
            }}>Paste</button>
          </div>
        </div>

        {/* Color-coded token display */}
        <textarea
          value={token}
          onChange={(e) => { setToken(e.target.value); setHeader(null); setPayload(null); setError(""); }}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
          rows={4}
          style={{ ...monoStyle, wordBreak: "break-all" }}
          spellCheck={false}
        />

        {hasThreeParts && !header && (
          <div style={{
            marginTop: 8, display: "flex", gap: 4, fontSize: 11,
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            <span style={{ color: "#f87171" }}>Header</span>
            <span style={{ color: "#52525b" }}>.</span>
            <span style={{ color: "#a78bfa" }}>Payload</span>
            <span style={{ color: "#52525b" }}>.</span>
            <span style={{ color: "#60a5fa" }}>Signature</span>
          </div>
        )}

        <button
          onClick={() => decode()}
          style={{
            ...btnBase, marginTop: 12,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff",
            boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
          }}
        >Decode JWT</button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          marginBottom: 20, padding: "14px 18px", borderRadius: 10,
          background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12, color: "#f87171",
        }}>{error}</div>
      )}

      {/* Results */}
      {header && payload && (
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
          {/* Header */}
          <div style={{ flex: "1 1 300px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ ...labelStyle, color: "#f87171" }}>Header</div>
              <button onClick={() => handleCopy("header")} style={{
                ...btnBase, fontSize: 11, padding: "4px 10px",
                background: copied === "header" ? "rgba(34,197,94,0.15)" : "rgba(24,24,27,0.6)",
                color: copied === "header" ? "#4ade80" : "#a1a1aa",
                border: copied === "header" ? "1px solid rgba(34,197,94,0.3)" : "1px solid #27272a",
              }}>{copied === "header" ? "Copied!" : "Copy"}</button>
            </div>
            <pre style={{
              ...monoStyle, color: "#f8a0a0", whiteSpace: "pre-wrap",
              minHeight: 80,
            }}>{JSON.stringify(header, null, 2)}</pre>
          </div>

          {/* Payload */}
          <div style={{ flex: "1 1 300px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ ...labelStyle, color: "#a78bfa" }}>Payload</div>
              <button onClick={() => handleCopy("payload")} style={{
                ...btnBase, fontSize: 11, padding: "4px 10px",
                background: copied === "payload" ? "rgba(34,197,94,0.15)" : "rgba(24,24,27,0.6)",
                color: copied === "payload" ? "#4ade80" : "#a1a1aa",
                border: copied === "payload" ? "1px solid rgba(34,197,94,0.3)" : "1px solid #27272a",
              }}>{copied === "payload" ? "Copied!" : "Copy"}</button>
            </div>
            <pre style={{
              ...monoStyle, color: "#c4b5fd", whiteSpace: "pre-wrap",
              minHeight: 80,
            }}>{JSON.stringify(payload, null, 2)}</pre>
          </div>
        </div>
      )}

      {/* Timestamps */}
      {payload && Object.keys(TIME_FIELDS).some((k) => typeof payload[k] === "number") && (
        <div style={{ marginTop: 20 }}>
          <div style={{ ...labelStyle, marginBottom: 10 }}>Timestamps</div>
          {Object.keys(TIME_FIELDS).map((k) =>
            typeof payload[k] === "number" ? renderTimestamp(k, payload[k]) : null
          )}
        </div>
      )}

      {/* Signature note */}
      {header && (
        <div style={{
          marginTop: 20, padding: "14px 18px", borderRadius: 10,
          background: "rgba(96,165,250,0.06)", border: "1px solid rgba(96,165,250,0.15)",
          fontSize: 12, color: "#60a5fa", fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          Algoritma: <strong>{header.alg || "Unknown"}</strong> — Verifikasi signature membutuhkan secret key dan tidak dilakukan di browser ini.
        </div>
      )}
    </div>
  );
}
