import { useState, useRef, useCallback } from "react";

const PRESETS = [
  { label: "Custom", w: null, h: null, desc: "Atur manual" },
  { label: "KTP / SIM (3×4)", w: 354, h: 472, desc: "3×4 cm @300dpi" },
  { label: "SKCK (4×6)", w: 472, h: 709, desc: "4×6 cm @300dpi" },
  { label: "Paspor ID (5×5)", w: 591, h: 591, desc: "51×51 mm @300dpi" },
  { label: "Visa US (2×2 in)", w: 600, h: 600, desc: "2×2 inch @300dpi" },
  { label: "Visa Jepang (4.5×3.5)", w: 413, h: 531, desc: "3.5×4.5 cm @300dpi" },
  { label: "Visa Schengen (3.5×4.5)", w: 413, h: 531, desc: "3.5×4.5 cm @300dpi" },
  { label: "Ijazah (3×4)", w: 354, h: 472, desc: "3×4 cm @300dpi" },
  { label: "Ijazah (4×6)", w: 472, h: 709, desc: "4×6 cm @300dpi" },
  { label: "LinkedIn / Profile", w: 800, h: 800, desc: "800×800 px" },
  { label: "Instagram Post", w: 1080, h: 1080, desc: "1080×1080 px" },
  { label: "WhatsApp DP", w: 500, h: 500, desc: "500×500 px" },
];

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

async function compressImage(img, targetW, targetH, targetBytes, format) {
  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, targetW, targetH);

  if (format === "image/png") {
    const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
    return { blob, quality: 100 };
  }

  const maxBlob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 1.0));
  if (targetBytes <= 0 || maxBlob.size <= targetBytes) {
    return { blob: maxBlob, quality: 100 };
  }

  let lo = 0.01, hi = 1.0, bestBlob = null, bestQ = 1.0;
  for (let i = 0; i < 15; i++) {
    const mid = (lo + hi) / 2;
    const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", mid));
    if (blob.size <= targetBytes) {
      bestBlob = blob;
      bestQ = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  if (!bestBlob) {
    bestBlob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.01));
    bestQ = 0.01;
  }

  return { blob: bestBlob, quality: Math.round(bestQ * 100) };
}

const labelStyle = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 12, fontWeight: 600, color: "#a1a1aa",
  letterSpacing: "0.03em",
};

const inputStyle = {
  background: "#18181b", border: "1px solid #27272a",
  borderRadius: 8, padding: "8px 12px",
  color: "#e4e4e7", fontSize: 13,
  fontFamily: "'JetBrains Mono', monospace",
  outline: "none", width: "100%",
};

export default function ImageCompressor() {
  const [file, setFile] = useState(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [imgEl, setImgEl] = useState(null);
  const [origW, setOrigW] = useState(0);
  const [origH, setOrigH] = useState(0);
  const [origSize, setOrigSize] = useState(0);
  const [preset, setPreset] = useState(0);
  const [targetW, setTargetW] = useState(0);
  const [targetH, setTargetH] = useState(0);
  const [lockRatio, setLockRatio] = useState(true);
  const [targetSizeVal, setTargetSizeVal] = useState("");
  const [targetSizeUnit, setTargetSizeUnit] = useState("KB");
  const [format, setFormat] = useState("image/jpeg");
  const [resultBlob, setResultBlob] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [resultQuality, setResultQuality] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = useCallback((f) => {
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setOrigSize(f.size);
    setResultBlob(null); setResultUrl(null); setResultQuality(null);
    const url = URL.createObjectURL(f);
    setImgSrc(url);
    const img = new Image();
    img.onload = () => {
      setImgEl(img);
      setOrigW(img.naturalWidth); setOrigH(img.naturalHeight);
      setTargetW(img.naturalWidth); setTargetH(img.naturalHeight);
      setPreset(0);
    };
    img.src = url;
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const applyPreset = (idx) => {
    setPreset(idx);
    const p = PRESETS[idx];
    if (p.w && p.h) {
      setTargetW(p.w); setTargetH(p.h); setLockRatio(false);
    } else if (imgEl) {
      setTargetW(imgEl.naturalWidth); setTargetH(imgEl.naturalHeight); setLockRatio(true);
    }
  };

  const handleWidthChange = (val) => {
    const w = parseInt(val) || 0;
    setTargetW(w);
    if (lockRatio && origW > 0) setTargetH(Math.round((w / origW) * origH));
  };

  const handleHeightChange = (val) => {
    const h = parseInt(val) || 0;
    setTargetH(h);
    if (lockRatio && origH > 0) setTargetW(Math.round((h / origH) * origW));
  };

  const doCompress = async () => {
    if (!imgEl) return;
    setProcessing(true);
    try {
      let targetBytes = 0;
      if (targetSizeVal && parseFloat(targetSizeVal) > 0) {
        const val = parseFloat(targetSizeVal);
        targetBytes = targetSizeUnit === "MB" ? val * 1024 * 1024 : val * 1024;
      }
      const { blob, quality } = await compressImage(imgEl, targetW || origW, targetH || origH, targetBytes, format);
      if (resultUrl) URL.revokeObjectURL(resultUrl);
      setResultBlob(blob); setResultUrl(URL.createObjectURL(blob)); setResultQuality(quality);
    } catch (e) { console.error(e); }
    setProcessing(false);
  };

  const doDownload = () => {
    if (!resultUrl || !resultBlob) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    const ext = format === "image/png" ? "png" : "jpg";
    const name = file?.name?.replace(/\.[^.]+$/, "") || "image";
    a.download = `${name}_compressed.${ext}`;
    a.click();
  };

  const reset = () => {
    if (imgSrc) URL.revokeObjectURL(imgSrc);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    setFile(null); setImgSrc(null); setImgEl(null);
    setOrigW(0); setOrigH(0); setOrigSize(0);
    setPreset(0); setTargetW(0); setTargetH(0);
    setLockRatio(true); setTargetSizeVal(""); setTargetSizeUnit("KB");
    setFormat("image/jpeg"); setResultBlob(null); setResultUrl(null); setResultQuality(null);
  };

  const reduction = resultBlob ? Math.max(0, ((1 - resultBlob.size / origSize) * 100)).toFixed(1) : null;

  return (
    <div style={{ padding: "24px 24px 24px 24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 20, fontWeight: 700, color: "#e4e4e7",
            display: "flex", alignItems: "center", gap: 8,
          }}>🗜️ Image Compressor</h2>
          <p style={{ color: "#52525b", fontSize: 12, marginTop: 4, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Compress & resize gambar dengan preset dokumen
          </p>
        </div>

        {/* Drop Zone */}
        {!file && (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            style={{
              border: `2px dashed ${dragOver ? "#6366f1" : "#27272a"}`,
              borderRadius: 16, padding: "64px 32px", textAlign: "center",
              cursor: "pointer",
              background: dragOver ? "rgba(99,102,241,0.05)" : "rgba(24,24,27,0.5)",
              transition: "all 0.2s",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 600, color: "#a1a1aa" }}>
              Drop gambar di sini atau klik untuk upload
            </p>
            <p style={{ color: "#52525b", fontSize: 12, marginTop: 6 }}>JPG, PNG, WebP</p>
            <input ref={inputRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => handleFile(e.target.files?.[0])} />
          </div>
        )}

        {file && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Info Bar */}
            <div style={{
              background: "rgba(24,24,27,0.6)", border: "1px solid #27272a",
              borderRadius: 12, padding: "14px 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              flexWrap: "wrap", gap: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 13, color: "#71717a" }}>📄</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: "#a5b4fc", fontWeight: 600 }}>
                  {file.name}
                </span>
              </div>
              <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#71717a", fontFamily: "'JetBrains Mono', monospace" }}>
                <span>{origW}×{origH} px</span>
                <span>{formatBytes(origSize)}</span>
              </div>
              <button onClick={reset} style={{
                background: "rgba(239,68,68,0.1)", color: "#f87171",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 8, padding: "6px 14px", cursor: "pointer",
                fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
              }}>Ganti Gambar</button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Presets */}
                <div style={{ background: "rgba(24,24,27,0.6)", border: "1px solid #27272a", borderRadius: 12, padding: 16 }}>
                  <label style={labelStyle}>📐 Preset Ukuran</label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}>
                    {PRESETS.map((p, i) => (
                      <button key={i} onClick={() => applyPreset(i)} style={{
                        padding: "8px 10px", borderRadius: 8,
                        border: preset === i ? "1px solid #6366f1" : "1px solid #27272a",
                        background: preset === i ? "rgba(99,102,241,0.15)" : "rgba(24,24,27,0.4)",
                        color: preset === i ? "#a5b4fc" : "#a1a1aa",
                        cursor: "pointer", fontSize: 11,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontWeight: preset === i ? 600 : 400, textAlign: "left",
                      }}>
                        <div>{p.label}</div>
                        <div style={{ fontSize: 9, color: "#52525b", marginTop: 2 }}>{p.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dimensions */}
                <div style={{ background: "rgba(24,24,27,0.6)", border: "1px solid #27272a", borderRadius: 12, padding: 16 }}>
                  <label style={labelStyle}>📏 Dimensi (px)</label>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                    <input type="number" value={targetW || ""} onChange={(e) => handleWidthChange(e.target.value)} placeholder="Width" style={inputStyle} />
                    <span style={{ color: "#52525b", fontSize: 14 }}>×</span>
                    <input type="number" value={targetH || ""} onChange={(e) => handleHeightChange(e.target.value)} placeholder="Height" style={inputStyle} />
                  </div>
                  <button onClick={() => setLockRatio(!lockRatio)} style={{
                    marginTop: 8, background: "none", border: "none",
                    color: lockRatio ? "#6366f1" : "#52525b",
                    cursor: "pointer", fontSize: 12, fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}>
                    {lockRatio ? "🔗 Aspect ratio terkunci" : "🔓 Aspect ratio bebas"}
                  </button>
                </div>

                {/* Target Size */}
                <div style={{ background: "rgba(24,24,27,0.6)", border: "1px solid #27272a", borderRadius: 12, padding: 16 }}>
                  <label style={labelStyle}>💾 Target Ukuran File (opsional)</label>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <input type="number" value={targetSizeVal} onChange={(e) => setTargetSizeVal(e.target.value)}
                      placeholder="Contoh: 200" style={{ ...inputStyle, flex: 1 }} min="1" />
                    <select value={targetSizeUnit} onChange={(e) => setTargetSizeUnit(e.target.value)}
                      style={{ ...inputStyle, width: 70, cursor: "pointer" }}>
                      <option value="KB">KB</option>
                      <option value="MB">MB</option>
                    </select>
                  </div>
                  <p style={{ fontSize: 10, color: "#52525b", marginTop: 6 }}>Kosongkan jika tidak ingin membatasi ukuran file</p>
                </div>

                {/* Format */}
                <div style={{ background: "rgba(24,24,27,0.6)", border: "1px solid #27272a", borderRadius: 12, padding: 16 }}>
                  <label style={labelStyle}>🎨 Format Output</label>
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {[["image/jpeg", "JPEG"], ["image/png", "PNG"]].map(([val, lbl]) => (
                      <button key={val} onClick={() => setFormat(val)} style={{
                        flex: 1, padding: "8px 0", borderRadius: 8,
                        border: format === val ? "1px solid #6366f1" : "1px solid #27272a",
                        background: format === val ? "rgba(99,102,241,0.15)" : "rgba(24,24,27,0.4)",
                        color: format === val ? "#a5b4fc" : "#71717a",
                        cursor: "pointer", fontSize: 13, fontWeight: 600,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}>{lbl}</button>
                    ))}
                  </div>
                  {format === "image/png" && (
                    <p style={{ fontSize: 10, color: "#f59e0b", marginTop: 6 }}>⚠️ PNG lossless — target ukuran file tidak berlaku</p>
                  )}
                </div>

                <button onClick={doCompress} disabled={processing} style={{
                  padding: "14px 0", borderRadius: 12, border: "none",
                  background: processing ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "#fff", fontSize: 15, fontWeight: 700,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  cursor: processing ? "wait" : "pointer",
                }}>
                  {processing ? "⏳ Memproses..." : "🚀 Compress & Resize"}
                </button>
              </div>

              {/* Preview */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "rgba(24,24,27,0.6)", border: "1px solid #27272a", borderRadius: 12, padding: 16 }}>
                  <label style={labelStyle}>🖼️ Original</label>
                  <div style={{
                    marginTop: 8, borderRadius: 8, overflow: "hidden", background: "#18181b",
                    display: "flex", alignItems: "center", justifyContent: "center", minHeight: 180,
                  }}>
                    <img src={imgSrc} alt="Original" style={{ maxWidth: "100%", maxHeight: 260, objectFit: "contain" }} />
                  </div>
                </div>

                {resultUrl && (
                  <div style={{ background: "rgba(24,24,27,0.6)", border: "1px solid #27272a", borderRadius: 12, padding: 16 }}>
                    <label style={labelStyle}>✅ Hasil</label>
                    <div style={{
                      marginTop: 8, borderRadius: 8, overflow: "hidden", background: "#18181b",
                      display: "flex", alignItems: "center", justifyContent: "center", minHeight: 180,
                    }}>
                      <img src={resultUrl} alt="Compressed" style={{ maxWidth: "100%", maxHeight: 260, objectFit: "contain" }} />
                    </div>
                    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                      {[
                        ["Ukuran", formatBytes(resultBlob.size)],
                        ["Quality", `${resultQuality}%`],
                        ["Hemat", `${reduction}%`],
                      ].map(([label, val]) => (
                        <div key={label} style={{
                          background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)",
                          borderRadius: 8, padding: "8px 10px", textAlign: "center",
                        }}>
                          <div style={{ fontSize: 10, color: "#71717a" }}>{label}</div>
                          <div style={{ fontSize: 14, fontWeight: 700, color: "#a5b4fc", fontFamily: "'JetBrains Mono', monospace" }}>{val}</div>
                        </div>
                      ))}
                    </div>
                    <button onClick={doDownload} style={{
                      marginTop: 12, width: "100%", padding: "12px 0", borderRadius: 10,
                      border: "1px solid #22c55e", background: "rgba(34,197,94,0.1)",
                      color: "#4ade80", fontSize: 14, fontWeight: 700,
                      fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer",
                    }}>⬇️ Download Hasil</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
