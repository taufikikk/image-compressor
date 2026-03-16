import { useState, useRef, useCallback } from "react";
import QRCode from "qrcode";

const PRESETS = [
  { label: "URL / Link", placeholder: "https://example.com", icon: "🔗" },
  { label: "Teks Biasa", placeholder: "Ketik teks apapun...", icon: "📝" },
  { label: "WhatsApp", placeholder: "628123456789", icon: "💬" },
  { label: "Email", placeholder: "email@example.com", icon: "📧" },
  { label: "WiFi", placeholder: "NamaWiFi", icon: "📶" },
];

const SIZES = [256, 512, 1024, 2048];

const COLORS = [
  { label: "Hitam", fg: "#000000", bg: "#ffffff" },
  { label: "Navy", fg: "#1e3a5f", bg: "#ffffff" },
  { label: "Hijau Tua", fg: "#064e3b", bg: "#ffffff" },
  { label: "Ungu", fg: "#4c1d95", bg: "#ffffff" },
  { label: "Merah Tua", fg: "#7f1d1d", bg: "#ffffff" },
];

const labelStyle = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 12, fontWeight: 600, color: "#a1a1aa",
  letterSpacing: "0.03em",
};

const inputStyle = {
  background: "#18181b", border: "1px solid #27272a",
  borderRadius: 8, padding: "10px 14px",
  color: "#e4e4e7", fontSize: 13,
  fontFamily: "'JetBrains Mono', monospace",
  outline: "none", width: "100%",
};

const btnBase = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 13, fontWeight: 600,
  border: "none", borderRadius: 8,
  cursor: "pointer", transition: "all 0.15s",
  padding: "10px 18px",
};

export default function QrCodeGenerator() {
  const [presetIdx, setPresetIdx] = useState(0);
  const [text, setText] = useState("");
  const [wifiPass, setWifiPass] = useState("");
  const [wifiEncryption, setWifiEncryption] = useState("WPA");
  const [size, setSize] = useState(512);
  const [colorIdx, setColorIdx] = useState(0);
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [error, setError] = useState("");
  const canvasRef = useRef(null);

  function buildContent() {
    const preset = PRESETS[presetIdx];
    const val = text.trim();
    if (!val) return null;

    switch (preset.label) {
      case "WhatsApp":
        return `https://wa.me/${val.replace(/[^0-9]/g, "")}`;
      case "Email":
        return `mailto:${val}`;
      case "WiFi":
        return `WIFI:T:${wifiEncryption};S:${val};P:${wifiPass};;`;
      default:
        return val;
    }
  }

  async function generate() {
    const content = buildContent();
    if (!content) {
      setError("Masukkan konten terlebih dahulu.");
      setQrDataUrl(null);
      return;
    }
    setError("");
    try {
      const color = COLORS[colorIdx];
      const dataUrl = await QRCode.toDataURL(content, {
        width: size,
        margin: 2,
        color: { dark: color.fg, light: color.bg },
        errorCorrectionLevel: "H",
      });
      setQrDataUrl(dataUrl);
    } catch (err) {
      setError("Gagal membuat QR Code: " + err.message);
      setQrDataUrl(null);
    }
  }

  function download() {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `qrcode_${size}px.png`;
    a.click();
  }

  const preset = PRESETS[presetIdx];

  return (
    <div style={{ padding: "32px 36px", maxWidth: 900, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 22, fontWeight: 700,
          background: "linear-gradient(135deg, #6366f1, #a78bfa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 6,
        }}>QR Code Generator</h1>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13, color: "#52525b",
        }}>Buat QR Code untuk URL, teks, WhatsApp, email, atau WiFi.</p>
      </div>

      <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
        {/* Controls */}
        <div style={{ flex: "1 1 320px", display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Preset type */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Tipe Konten</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {PRESETS.map((p, i) => (
                <button
                  key={p.label}
                  onClick={() => { setPresetIdx(i); setText(""); setQrDataUrl(null); setError(""); }}
                  style={{
                    ...btnBase, fontSize: 12, padding: "8px 12px",
                    background: presetIdx === i ? "rgba(99,102,241,0.15)" : "rgba(24,24,27,0.6)",
                    color: presetIdx === i ? "#a5b4fc" : "#a1a1aa",
                    border: presetIdx === i ? "1px solid rgba(99,102,241,0.3)" : "1px solid #27272a",
                  }}
                >
                  {p.icon} {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 8 }}>
              {preset.label === "WiFi" ? "Nama WiFi (SSID)" : "Konten"}
            </div>
            <input
              value={text}
              onChange={(e) => { setText(e.target.value); setQrDataUrl(null); }}
              placeholder={preset.placeholder}
              style={inputStyle}
            />
          </div>

          {/* WiFi extras */}
          {preset.label === "WiFi" && (
            <>
              <div>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Password WiFi</div>
                <input
                  value={wifiPass}
                  onChange={(e) => { setWifiPass(e.target.value); setQrDataUrl(null); }}
                  placeholder="Password..."
                  style={inputStyle}
                />
              </div>
              <div>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Enkripsi</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["WPA", "WEP", "nopass"].map((enc) => (
                    <button
                      key={enc}
                      onClick={() => { setWifiEncryption(enc); setQrDataUrl(null); }}
                      style={{
                        ...btnBase, fontSize: 12, padding: "6px 14px",
                        background: wifiEncryption === enc ? "rgba(99,102,241,0.15)" : "rgba(24,24,27,0.6)",
                        color: wifiEncryption === enc ? "#a5b4fc" : "#a1a1aa",
                        border: wifiEncryption === enc ? "1px solid rgba(99,102,241,0.3)" : "1px solid #27272a",
                      }}
                    >{enc === "nopass" ? "Open" : enc}</button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Size */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Ukuran (px)</div>
            <div style={{ display: "flex", gap: 6 }}>
              {SIZES.map((s) => (
                <button
                  key={s}
                  onClick={() => { setSize(s); setQrDataUrl(null); }}
                  style={{
                    ...btnBase, flex: 1, fontSize: 12, padding: "8px 6px",
                    background: size === s ? "rgba(99,102,241,0.15)" : "rgba(24,24,27,0.6)",
                    color: size === s ? "#a5b4fc" : "#a1a1aa",
                    border: size === s ? "1px solid rgba(99,102,241,0.3)" : "1px solid #27272a",
                  }}
                >{s}</button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <div style={{ ...labelStyle, marginBottom: 8 }}>Warna</div>
            <div style={{ display: "flex", gap: 8 }}>
              {COLORS.map((c, i) => (
                <button
                  key={c.label}
                  onClick={() => { setColorIdx(i); setQrDataUrl(null); }}
                  title={c.label}
                  style={{
                    width: 36, height: 36, borderRadius: 8,
                    background: c.fg,
                    border: colorIdx === i ? "2px solid #6366f1" : "2px solid #27272a",
                    cursor: "pointer", position: "relative",
                  }}
                >
                  {colorIdx === i && (
                    <div style={{
                      position: "absolute", inset: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "#fff", fontSize: 14, fontWeight: 700,
                    }}>✓</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Generate */}
          <button
            onClick={generate}
            style={{
              ...btnBase,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
            }}
          >Generate QR Code</button>

          {error && (
            <div style={{
              padding: "10px 14px", borderRadius: 8,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
              fontSize: 12, color: "#f87171", fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>{error}</div>
          )}
        </div>

        {/* Preview */}
        <div style={{ flex: "0 0 300px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ ...labelStyle, marginBottom: 8, alignSelf: "flex-start" }}>Preview</div>
          <div style={{
            background: "rgba(24,24,27,0.5)",
            borderRadius: 12, border: "1px solid #27272a",
            padding: 24, width: "100%",
            display: "flex", flexDirection: "column", alignItems: "center",
            minHeight: 280,
            justifyContent: "center",
          }}>
            {qrDataUrl ? (
              <>
                <img src={qrDataUrl} alt="QR Code" style={{
                  width: 240, height: 240,
                  borderRadius: 8,
                  imageRendering: "pixelated",
                }} />
                <div style={{
                  marginTop: 12, fontSize: 11, color: "#52525b",
                  fontFamily: "'JetBrains Mono', monospace",
                }}>{size} x {size} px</div>
              </>
            ) : (
              <div style={{
                fontSize: 13, color: "#3f3f46",
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                textAlign: "center",
              }}>QR Code akan muncul di sini</div>
            )}
          </div>

          {qrDataUrl && (
            <button
              onClick={download}
              style={{
                ...btnBase, width: "100%", marginTop: 12,
                background: "rgba(34,197,94,0.12)", color: "#4ade80",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >Download PNG</button>
          )}
        </div>
      </div>
    </div>
  );
}
