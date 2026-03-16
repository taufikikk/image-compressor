import { useState, useEffect, useRef } from "react";

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

const inputStyle = {
  background: "#18181b", border: "1px solid #27272a",
  borderRadius: 8, padding: "10px 14px",
  color: "#e4e4e7", fontSize: 14,
  fontFamily: "'JetBrains Mono', monospace",
  outline: "none", width: "100%",
};

function formatDate(d) {
  return {
    iso: d.toISOString(),
    utc: d.toUTCString(),
    local: d.toLocaleString("id-ID", { dateStyle: "full", timeStyle: "long" }),
    relative: getRelative(d),
    date: d.toLocaleDateString("en-CA"), // YYYY-MM-DD
    time: d.toLocaleTimeString("en-GB", { hour12: false }), // HH:MM:SS
  };
}

function getRelative(d) {
  const now = Date.now();
  const diff = d.getTime() - now;
  const abs = Math.abs(diff);
  const past = diff < 0;

  let val, unit;
  if (abs < 60000) { val = Math.round(abs / 1000); unit = "detik"; }
  else if (abs < 3600000) { val = Math.round(abs / 60000); unit = "menit"; }
  else if (abs < 86400000) { val = Math.round(abs / 3600000); unit = "jam"; }
  else if (abs < 2592000000) { val = Math.round(abs / 86400000); unit = "hari"; }
  else if (abs < 31536000000) { val = Math.round(abs / 2592000000); unit = "bulan"; }
  else { val = Math.round(abs / 31536000000); unit = "tahun"; }

  return past ? `${val} ${unit} yang lalu` : `${val} ${unit} dari sekarang`;
}

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
      style={{
        ...btnBase, fontSize: 10, padding: "3px 8px",
        background: copied ? "rgba(34,197,94,0.15)" : "rgba(24,24,27,0.6)",
        color: copied ? "#4ade80" : "#71717a",
        border: copied ? "1px solid rgba(34,197,94,0.3)" : "1px solid #27272a",
      }}
    >{copied ? "Copied!" : "Copy"}</button>
  );
}

export default function EpochConverter() {
  const [epoch, setEpoch] = useState("");
  const [dateInput, setDateInput] = useState("");
  const [timeInput, setTimeInput] = useState("");
  const [liveNow, setLiveNow] = useState(Date.now());
  const [result, setResult] = useState(null);
  const [dateResult, setDateResult] = useState(null);
  const [error, setError] = useState("");
  const [dateError, setDateError] = useState("");

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setLiveNow(Date.now()), 100);
    return () => clearInterval(id);
  }, []);

  function convertEpoch() {
    const raw = epoch.trim();
    if (!raw) { setError("Masukkan epoch timestamp."); setResult(null); return; }
    const num = Number(raw);
    if (isNaN(num)) { setError("Bukan angka yang valid."); setResult(null); return; }

    // Auto-detect seconds vs milliseconds
    let ms;
    if (num > 1e12) {
      ms = num; // already milliseconds
    } else {
      ms = num * 1000; // seconds → ms
    }

    const d = new Date(ms);
    if (isNaN(d.getTime())) { setError("Timestamp tidak valid."); setResult(null); return; }

    setResult({
      ...formatDate(d),
      seconds: Math.floor(ms / 1000),
      milliseconds: ms,
      autoDetected: num > 1e12 ? "milliseconds" : "seconds",
    });
    setError("");
  }

  function convertDate() {
    if (!dateInput) { setDateError("Pilih tanggal terlebih dahulu."); setDateResult(null); return; }
    const time = timeInput || "00:00:00";
    const d = new Date(`${dateInput}T${time}`);
    if (isNaN(d.getTime())) { setDateError("Tanggal/waktu tidak valid."); setDateResult(null); return; }

    setDateResult({
      seconds: Math.floor(d.getTime() / 1000),
      milliseconds: d.getTime(),
      ...formatDate(d),
    });
    setDateError("");
  }

  function useNow() {
    const now = Math.floor(Date.now() / 1000);
    setEpoch(String(now));
    const d = new Date();
    setResult({
      ...formatDate(d),
      seconds: now,
      milliseconds: d.getTime(),
      autoDetected: "seconds",
    });
    setError("");
  }

  const nowSec = Math.floor(liveNow / 1000);

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 22, fontWeight: 700,
          background: "linear-gradient(135deg, #6366f1, #a78bfa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 6,
        }}>Epoch Converter</h1>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13, color: "#52525b",
        }}>Konversi Unix epoch timestamp ke tanggal dan sebaliknya.</p>
      </div>

      {/* Live clock */}
      <div style={{
        marginBottom: 28, padding: "18px 22px", borderRadius: 12,
        background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.15)",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 10, color: "#6366f1", fontWeight: 600, marginBottom: 4, fontFamily: "'Plus Jakarta Sans', sans-serif", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Current Epoch
          </div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 28, fontWeight: 700, color: "#a5b4fc",
            letterSpacing: "0.02em",
          }}>{nowSec}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 12, color: "#a1a1aa", fontFamily: "'JetBrains Mono', monospace" }}>
            {new Date(liveNow).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "long" })}
          </div>
          <div style={{ fontSize: 11, color: "#52525b", fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
            {new Date(liveNow).toISOString()}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        {/* Epoch → Date */}
        <div style={{
          flex: "1 1 380px", padding: "22px", borderRadius: 12,
          background: "rgba(24,24,27,0.5)", border: "1px solid #27272a",
        }}>
          <div style={{ ...labelStyle, marginBottom: 12, fontSize: 14 }}>Epoch → Tanggal</div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              value={epoch}
              onChange={(e) => { setEpoch(e.target.value); setResult(null); setError(""); }}
              placeholder="1700000000"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={useNow} style={{
              ...btnBase, fontSize: 11, padding: "8px 14px", flexShrink: 0,
              background: "rgba(24,24,27,0.8)", color: "#a1a1aa", border: "1px solid #27272a",
            }}>Now</button>
          </div>

          <button onClick={convertEpoch} style={{
            ...btnBase, width: "100%", marginBottom: 16,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff", boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
          }}>Convert</button>

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 12,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              fontSize: 12, color: "#f87171", fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>{error}</div>
          )}

          {result && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {result.autoDetected && (
                <div style={{
                  fontSize: 10, color: "#6366f1", fontFamily: "'Plus Jakarta Sans', sans-serif",
                  marginBottom: 4,
                }}>Auto-detected: {result.autoDetected}</div>
              )}
              {[
                { label: "ISO 8601", val: result.iso },
                { label: "UTC", val: result.utc },
                { label: "Lokal", val: result.local },
                { label: "Relatif", val: result.relative },
                { label: "Epoch (s)", val: String(result.seconds) },
                { label: "Epoch (ms)", val: String(result.milliseconds) },
              ].map((row) => (
                <div key={row.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 12px", borderRadius: 8,
                  background: "rgba(14,14,20,0.6)", border: "1px solid #1e1e2a",
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#52525b", marginBottom: 2 }}>{row.label}</div>
                    <div style={{ fontSize: 12, color: "#e4e4e7", fontFamily: "'JetBrains Mono', monospace", wordBreak: "break-all" }}>{row.val}</div>
                  </div>
                  <CopyBtn text={row.val} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Date → Epoch */}
        <div style={{
          flex: "1 1 380px", padding: "22px", borderRadius: 12,
          background: "rgba(24,24,27,0.5)", border: "1px solid #27272a",
        }}>
          <div style={{ ...labelStyle, marginBottom: 12, fontSize: 14 }}>Tanggal → Epoch</div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              type="date"
              value={dateInput}
              onChange={(e) => { setDateInput(e.target.value); setDateResult(null); setDateError(""); }}
              style={{ ...inputStyle, flex: 1, colorScheme: "dark" }}
            />
            <input
              type="time"
              step="1"
              value={timeInput}
              onChange={(e) => { setTimeInput(e.target.value); setDateResult(null); setDateError(""); }}
              style={{ ...inputStyle, flex: 1, colorScheme: "dark" }}
            />
          </div>

          <button onClick={convertDate} style={{
            ...btnBase, width: "100%", marginBottom: 16,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#fff", boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
          }}>Convert</button>

          {dateError && (
            <div style={{
              padding: "10px 14px", borderRadius: 8, marginBottom: 12,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
              fontSize: 12, color: "#f87171", fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>{dateError}</div>
          )}

          {dateResult && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Epoch (seconds)", val: String(dateResult.seconds) },
                { label: "Epoch (milliseconds)", val: String(dateResult.milliseconds) },
                { label: "ISO 8601", val: dateResult.iso },
                { label: "Lokal", val: dateResult.local },
                { label: "Relatif", val: dateResult.relative },
              ].map((row) => (
                <div key={row.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 12px", borderRadius: 8,
                  background: "rgba(14,14,20,0.6)", border: "1px solid #1e1e2a",
                }}>
                  <div>
                    <div style={{ fontSize: 10, color: "#52525b", marginBottom: 2 }}>{row.label}</div>
                    <div style={{ fontSize: 12, color: "#e4e4e7", fontFamily: "'JetBrains Mono', monospace", wordBreak: "break-all" }}>{row.val}</div>
                  </div>
                  <CopyBtn text={row.val} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
