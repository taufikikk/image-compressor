import { useState, useRef, useCallback, useEffect } from "react";

const BG_OPTIONS = [
  { id: "transparent", label: "Transparan", color: null },
  { id: "white", label: "Putih", color: "#ffffff" },
  { id: "red", label: "Merah", color: "#cc0000" },
  { id: "blue", label: "Biru", color: "#0044cc" },
  { id: "green", label: "Hijau", color: "#007722" },
  { id: "custom", label: "Custom", color: null },
];

const labelStyle = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 12, fontWeight: 600, color: "#a1a1aa",
  letterSpacing: "0.03em",
};

function formatBytes(bytes) {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(2) + " MB";
}

function CheckerBoard({ children, style }) {
  return (
    <div style={{
      ...style,
      backgroundImage: `
        linear-gradient(45deg, #27272a 25%, transparent 25%),
        linear-gradient(-45deg, #27272a 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #27272a 75%),
        linear-gradient(-45deg, transparent 75%, #27272a 75%)
      `,
      backgroundSize: "16px 16px",
      backgroundPosition: "0 0, 0 8px, 8px -8px, -8px 0px",
      backgroundColor: "#18181b",
    }}>
      {children}
    </div>
  );
}

export default function BackgroundRemover() {
  const [file, setFile] = useState(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [origSize, setOrigSize] = useState(0);
  const [origW, setOrigW] = useState(0);
  const [origH, setOrigH] = useState(0);

  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [resultBlob, setResultBlob] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);

  const [bgOption, setBgOption] = useState("transparent");
  const [customColor, setCustomColor] = useState("#ff6600");
  const [finalUrl, setFinalUrl] = useState(null);
  const [finalBlob, setFinalBlob] = useState(null);

  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = useCallback((f) => {
    if (!f || !f.type.startsWith("image/")) return;
    setFile(f);
    setOrigSize(f.size);
    setResultBlob(null); setResultUrl(null);
    setFinalUrl(null); setFinalBlob(null);
    setBgOption("transparent");

    const url = URL.createObjectURL(f);
    setImgSrc(url);
    const img = new Image();
    img.onload = () => {
      setOrigW(img.naturalWidth);
      setOrigH(img.naturalHeight);
    };
    img.src = url;
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const doRemoveBg = async () => {
    if (!file) return;
    setProcessing(true);
    setProgress("Memuat AI model (~40MB, pertama kali saja)...");

    try {
      const { removeBackground } = await import("@imgly/background-removal");

      setProgress("Menghapus background...");

      const blob = await removeBackground(file, {
        progress: (key, current, total) => {
          if (key === "compute:inference") {
            const pct = total > 0 ? Math.round((current / total) * 100) : 0;
            setProgress(`Memproses AI inference... ${pct}%`);
          } else if (key.includes("download")) {
            setProgress("Mengunduh model AI...");
          }
        },
      });

      if (resultUrl) URL.revokeObjectURL(resultUrl);
      const url = URL.createObjectURL(blob);
      setResultBlob(blob);
      setResultUrl(url);
      setFinalUrl(url);
      setFinalBlob(blob);
      setProgress("");
    } catch (e) {
      console.error(e);
      setProgress("❌ Gagal memproses. Coba gambar lain.");
      setTimeout(() => setProgress(""), 3000);
    }
    setProcessing(false);
  };

  // Apply background color
  useEffect(() => {
    if (!resultUrl || !resultBlob) return;

    const selectedColor =
      bgOption === "transparent" ? null :
      bgOption === "custom" ? customColor :
      BG_OPTIONS.find((o) => o.id === bgOption)?.color || null;

    if (!selectedColor) {
      setFinalUrl(resultUrl);
      setFinalBlob(resultBlob);
      return;
    }

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = selectedColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        if (blob) {
          if (finalUrl && finalUrl !== resultUrl) URL.revokeObjectURL(finalUrl);
          setFinalUrl(URL.createObjectURL(blob));
          setFinalBlob(blob);
        }
      }, "image/png");
    };
    img.src = resultUrl;
  }, [bgOption, customColor, resultUrl, resultBlob]);

  const doDownload = () => {
    if (!finalUrl) return;
    const a = document.createElement("a");
    a.href = finalUrl;
    const name = file?.name?.replace(/\.[^.]+$/, "") || "image";
    const ext = bgOption === "transparent" ? "png" : "png";
    a.download = `${name}_nobg.${ext}`;
    a.click();
  };

  const reset = () => {
    if (imgSrc) URL.revokeObjectURL(imgSrc);
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    if (finalUrl && finalUrl !== resultUrl) URL.revokeObjectURL(finalUrl);
    setFile(null); setImgSrc(null); setOrigSize(0); setOrigW(0); setOrigH(0);
    setResultBlob(null); setResultUrl(null);
    setFinalUrl(null); setFinalBlob(null);
    setProcessing(false); setProgress("");
    setBgOption("transparent"); setCustomColor("#ff6600");
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 20, fontWeight: 700, color: "#e4e4e7",
            display: "flex", alignItems: "center", gap: 8,
          }}>✂️ Background Remover</h2>
          <p style={{ color: "#52525b", fontSize: 12, marginTop: 4, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Hapus background foto dengan AI — langsung di browser
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
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12 }}>✂️</div>
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 600, color: "#a1a1aa" }}>
              Drop foto di sini atau klik untuk upload
            </p>
            <p style={{ color: "#52525b", fontSize: 12, marginTop: 6 }}>JPG, PNG, WebP — terbaik untuk foto orang/objek</p>
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
              {/* Left: Controls */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Remove BG Button */}
                {!resultUrl && (
                  <button onClick={doRemoveBg} disabled={processing} style={{
                    padding: "16px 0", borderRadius: 12, border: "none",
                    background: processing ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                    color: "#fff", fontSize: 15, fontWeight: 700,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    cursor: processing ? "wait" : "pointer",
                  }}>
                    {processing ? "⏳ Memproses..." : "✂️ Hapus Background"}
                  </button>
                )}

                {/* Progress */}
                {progress && (
                  <div style={{
                    background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)",
                    borderRadius: 10, padding: "12px 16px",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {processing && (
                        <div style={{
                          width: 16, height: 16, border: "2px solid #6366f1",
                          borderTopColor: "transparent", borderRadius: "50%",
                          animation: "spin 0.8s linear infinite",
                        }} />
                      )}
                      <span style={{
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        fontSize: 12, color: "#a5b4fc",
                      }}>{progress}</span>
                    </div>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                )}

                {/* BG Options (after removal) */}
                {resultUrl && (
                  <>
                    <div style={{ background: "rgba(24,24,27,0.6)", border: "1px solid #27272a", borderRadius: 12, padding: 16 }}>
                      <label style={labelStyle}>🎨 Ganti Background</label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 10 }}>
                        {BG_OPTIONS.map((opt) => (
                          <button key={opt.id} onClick={() => setBgOption(opt.id)} style={{
                            padding: "10px 8px", borderRadius: 8,
                            border: bgOption === opt.id ? "1px solid #6366f1" : "1px solid #27272a",
                            background: bgOption === opt.id ? "rgba(99,102,241,0.15)" : "rgba(24,24,27,0.4)",
                            cursor: "pointer", textAlign: "center",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                          }}>
                            {opt.color ? (
                              <div style={{
                                width: 20, height: 20, borderRadius: 4,
                                background: opt.color, border: "1px solid rgba(255,255,255,0.1)",
                              }} />
                            ) : opt.id === "transparent" ? (
                              <div style={{
                                width: 20, height: 20, borderRadius: 4,
                                backgroundImage: `
                                  linear-gradient(45deg, #555 25%, transparent 25%),
                                  linear-gradient(-45deg, #555 25%, transparent 25%),
                                  linear-gradient(45deg, transparent 75%, #555 75%),
                                  linear-gradient(-45deg, transparent 75%, #555 75%)
                                `,
                                backgroundSize: "8px 8px",
                                backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0",
                                backgroundColor: "#333",
                                border: "1px solid rgba(255,255,255,0.1)",
                              }} />
                            ) : (
                              <div style={{
                                width: 20, height: 20, borderRadius: 4,
                                background: "linear-gradient(135deg, #f06, #f90, #0f6, #06f)",
                                border: "1px solid rgba(255,255,255,0.1)",
                              }} />
                            )}
                            <span style={{
                              fontSize: 10,
                              color: bgOption === opt.id ? "#a5b4fc" : "#71717a",
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
                              fontWeight: bgOption === opt.id ? 600 : 400,
                            }}>{opt.label}</span>
                          </button>
                        ))}
                      </div>

                      {bgOption === "custom" && (
                        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 10 }}>
                          <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)}
                            style={{ width: 40, height: 32, border: "none", cursor: "pointer", borderRadius: 4 }} />
                          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#a1a1aa" }}>
                            {customColor}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Re-process */}
                    <button onClick={() => { setResultUrl(null); setResultBlob(null); setFinalUrl(null); setFinalBlob(null); }}
                      style={{
                        padding: "10px 0", borderRadius: 10,
                        border: "1px solid #27272a", background: "rgba(24,24,27,0.4)",
                        color: "#a1a1aa", fontSize: 12, fontWeight: 600,
                        fontFamily: "'Plus Jakarta Sans', sans-serif", cursor: "pointer",
                      }}>
                      🔄 Proses Ulang
                    </button>
                  </>
                )}
              </div>

              {/* Right: Preview */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Original */}
                <div style={{ background: "rgba(24,24,27,0.6)", border: "1px solid #27272a", borderRadius: 12, padding: 16 }}>
                  <label style={labelStyle}>🖼️ Original</label>
                  <div style={{
                    marginTop: 8, borderRadius: 8, overflow: "hidden", background: "#18181b",
                    display: "flex", alignItems: "center", justifyContent: "center", minHeight: 160,
                  }}>
                    <img src={imgSrc} alt="Original" style={{ maxWidth: "100%", maxHeight: 220, objectFit: "contain" }} />
                  </div>
                </div>

                {/* Result */}
                {finalUrl && (
                  <div style={{ background: "rgba(24,24,27,0.6)", border: "1px solid #27272a", borderRadius: 12, padding: 16 }}>
                    <label style={labelStyle}>✅ Hasil</label>
                    <CheckerBoard style={{
                      marginTop: 8, borderRadius: 8, overflow: "hidden",
                      display: "flex", alignItems: "center", justifyContent: "center", minHeight: 160,
                    }}>
                      <img src={finalUrl} alt="Result" style={{ maxWidth: "100%", maxHeight: 220, objectFit: "contain" }} />
                    </CheckerBoard>

                    {finalBlob && (
                      <div style={{
                        marginTop: 10, display: "flex", gap: 8, justifyContent: "center",
                      }}>
                        <div style={{
                          background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.15)",
                          borderRadius: 8, padding: "6px 14px", textAlign: "center",
                        }}>
                          <span style={{ fontSize: 10, color: "#71717a" }}>Ukuran: </span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "#a5b4fc", fontFamily: "'JetBrains Mono', monospace" }}>
                            {formatBytes(finalBlob.size)}
                          </span>
                        </div>
                      </div>
                    )}

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
