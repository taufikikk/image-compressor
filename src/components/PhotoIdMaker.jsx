import { useState, useRef, useCallback, useEffect } from "react";
import { removeBackground } from "@imgly/background-removal";

// Preset ukuran pas foto (dalam px @300dpi)
const PHOTO_PRESETS = [
  { label: "2x3 cm", w: 236, h: 354, desc: "KTP, SIM" },
  { label: "3x4 cm", w: 354, h: 472, desc: "KTP, Ijazah" },
  { label: "4x6 cm", w: 472, h: 709, desc: "SKCK, Lamaran" },
  { label: "2x2 inch", w: 600, h: 600, desc: "Visa US" },
  { label: "3.5x4.5 cm", w: 413, h: 531, desc: "Visa Schengen, Jepang" },
  { label: "5x5 cm", w: 591, h: 591, desc: "Paspor ID" },
];

// Print sheet presets
const PRINT_SHEETS = [
  { label: "4R (4x6 inch)", w: 1200, h: 1800, desc: "10x15 cm" },
  { label: "A4", w: 2480, h: 3508, desc: "21x29.7 cm" },
];

const BG_COLORS = [
  { label: "Merah", value: "#cc0000" },
  { label: "Biru", value: "#0055aa" },
  { label: "Putih", value: "#ffffff" },
  { label: "Transparan", value: null },
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

export default function PhotoIdMaker() {
  const [file, setFile] = useState(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [noBgSrc, setNoBgSrc] = useState(null); // background-removed version
  const [removingBg, setRemovingBg] = useState(false);
  const [bgProgress, setBgProgress] = useState("");
  const [processedSrc, setProcessedSrc] = useState(null);
  const [preset, setPreset] = useState(PHOTO_PRESETS[1]); // 3x4 default
  const [bgColor, setBgColor] = useState(BG_COLORS[0]); // merah default
  const [sheet, setSheet] = useState(PRINT_SHEETS[0]); // 4R default
  const [sheetResult, setSheetResult] = useState(null);

  // Crop & position state
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragOffsetStart, setDragOffsetStart] = useState({ x: 0, y: 0 });

  const canvasRef = useRef(null);
  const previewRef = useRef(null);
  const imgRef = useRef(null); // always holds the no-bg image for drawing
  const originalImgRef = useRef(null); // original image
  const fileInputRef = useRef(null);

  const onFile = useCallback((e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setSheetResult(null);
    setProcessedSrc(null);
    setNoBgSrc(null);
    setRemovingBg(true);
    setBgProgress("Memuat model AI...");

    // Load original image for display while removing bg
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImgSrc(ev.target.result);
      setScale(1);
      setOffsetX(0);
      setOffsetY(0);
    };
    reader.readAsDataURL(f);

    // Remove background
    removeBackground(f, {
      progress: (key, current, total) => {
        if (key === "compute:inference") {
          setBgProgress(`Menghapus background... ${Math.round((current / total) * 100)}%`);
        } else if (key.startsWith("fetch:")) {
          setBgProgress("Mengunduh model AI...");
        }
      },
    }).then((blob) => {
      const url = URL.createObjectURL(blob);
      setNoBgSrc(url);
      setRemovingBg(false);
      setBgProgress("");
    }).catch((err) => {
      console.error("BG removal failed:", err);
      setRemovingBg(false);
      setBgProgress("Gagal menghapus background. Gunakan foto dengan background polos.");
    });
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f || !f.type.startsWith("image/")) return;
    const dt = new DataTransfer();
    dt.items.add(f);
    fileInputRef.current.files = dt.files;
    fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
  }, []);

  // Load original image (for preview while bg is being removed)
  useEffect(() => {
    if (!imgSrc) return;
    const img = new Image();
    img.onload = () => {
      originalImgRef.current = img;
      if (!noBgSrc) {
        imgRef.current = img;
        redrawPreview();
      }
    };
    img.src = imgSrc;
  }, [imgSrc]);

  // When no-bg image is ready, load it and use it for drawing
  useEffect(() => {
    if (!noBgSrc) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      redrawPreview();
    };
    img.src = noBgSrc;
  }, [noBgSrc]);

  function redrawPreview() {
    if (!imgRef.current || !previewRef.current) return;
    const canvas = previewRef.current;
    const ctx = canvas.getContext("2d");
    const displayH = 320;
    const displayW = (preset.w / preset.h) * displayH;
    canvas.width = displayW;
    canvas.height = displayH;
    drawPreview(ctx, imgRef.current, displayW, displayH);
  }

  // Redraw on param changes
  useEffect(() => {
    redrawPreview();
  }, [scale, offsetX, offsetY, bgColor, preset, noBgSrc]);

  function drawPreview(ctx, img, cw, ch) {
    ctx.clearRect(0, 0, cw, ch);
    // Background
    if (bgColor.value) {
      ctx.fillStyle = bgColor.value;
      ctx.fillRect(0, 0, cw, ch);
    } else {
      // Checkerboard for transparent
      const sz = 10;
      for (let y = 0; y < ch; y += sz) {
        for (let x = 0; x < cw; x += sz) {
          ctx.fillStyle = ((x / sz + y / sz) % 2 === 0) ? "#2a2a2a" : "#1a1a1a";
          ctx.fillRect(x, y, sz, sz);
        }
      }
    }

    // Fit image to canvas then apply scale/offset
    const imgAspect = img.width / img.height;
    const canvasAspect = cw / ch;
    let drawW, drawH;
    if (imgAspect > canvasAspect) {
      drawH = ch * scale;
      drawW = drawH * imgAspect;
    } else {
      drawW = cw * scale;
      drawH = drawW / imgAspect;
    }

    const dx = (cw - drawW) / 2 + offsetX;
    const dy = (ch - drawH) / 2 + offsetY;
    ctx.drawImage(img, dx, dy, drawW, drawH);
  }

  // Mouse drag for positioning
  function onMouseDown(e) {
    setDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setDragOffsetStart({ x: offsetX, y: offsetY });
  }
  function onMouseMove(e) {
    if (!dragging) return;
    setOffsetX(dragOffsetStart.x + (e.clientX - dragStart.x));
    setOffsetY(dragOffsetStart.y + (e.clientY - dragStart.y));
  }
  function onMouseUp() { setDragging(false); }

  // Touch drag
  function onTouchStart(e) {
    const t = e.touches[0];
    setDragging(true);
    setDragStart({ x: t.clientX, y: t.clientY });
    setDragOffsetStart({ x: offsetX, y: offsetY });
  }
  function onTouchMove(e) {
    if (!dragging) return;
    const t = e.touches[0];
    setOffsetX(dragOffsetStart.x + (t.clientX - dragStart.x));
    setOffsetY(dragOffsetStart.y + (t.clientY - dragStart.y));
  }

  // Generate single ID photo
  function generatePhoto() {
    if (!imgRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = preset.w;
    canvas.height = preset.h;
    const ctx = canvas.getContext("2d");

    if (bgColor.value) {
      ctx.fillStyle = bgColor.value;
      ctx.fillRect(0, 0, preset.w, preset.h);
    }

    const img = imgRef.current;
    const imgAspect = img.width / img.height;
    const canvasAspect = preset.w / preset.h;
    let drawW, drawH;
    if (imgAspect > canvasAspect) {
      drawH = preset.h * scale;
      drawW = drawH * imgAspect;
    } else {
      drawW = preset.w * scale;
      drawH = drawW / imgAspect;
    }

    // Scale offset from preview coords to actual coords
    const previewCanvas = previewRef.current;
    const scaleFactorX = preset.w / previewCanvas.width;
    const scaleFactorY = preset.h / previewCanvas.height;
    const dx = (preset.w - drawW) / 2 + offsetX * scaleFactorX;
    const dy = (preset.h - drawH) / 2 + offsetY * scaleFactorY;
    ctx.drawImage(img, dx, dy, drawW, drawH);

    return canvas;
  }

  function handleGeneratePhoto() {
    const canvas = generatePhoto();
    if (!canvas) return;
    setProcessedSrc(canvas.toDataURL("image/jpeg", 0.95));
  }

  // Generate print sheet
  function handleGenerateSheet() {
    const photoCanvas = generatePhoto();
    if (!photoCanvas) return;

    const sheetCanvas = document.createElement("canvas");
    sheetCanvas.width = sheet.w;
    sheetCanvas.height = sheet.h;
    const ctx = sheetCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sheet.w, sheet.h);

    const margin = 30; // ~2.5mm margin @300dpi
    const gap = 20; // ~1.7mm gap
    const pw = preset.w;
    const ph = preset.h;

    const cols = Math.floor((sheet.w - 2 * margin + gap) / (pw + gap));
    const rows = Math.floor((sheet.h - 2 * margin + gap) / (ph + gap));

    const totalW = cols * pw + (cols - 1) * gap;
    const totalH = rows * ph + (rows - 1) * gap;
    const startX = (sheet.w - totalW) / 2;
    const startY = (sheet.h - totalH) / 2;

    // Draw cutting guides (light gray lines)
    ctx.strokeStyle = "#cccccc";
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 4]);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = startX + c * (pw + gap);
        const y = startY + r * (ph + gap);
        ctx.drawImage(photoCanvas, x, y, pw, ph);
        // Cutting guide
        ctx.strokeRect(x - 1, y - 1, pw + 2, ph + 2);
      }
    }

    ctx.setLineDash([]);
    const count = rows * cols;
    const dataUrl = sheetCanvas.toDataURL("image/jpeg", 0.95);
    setSheetResult({ dataUrl, count, cols, rows });
  }

  function downloadImage(dataUrl, filename) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    a.click();
  }

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1100, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 22, fontWeight: 700,
          background: "linear-gradient(135deg, #6366f1, #a78bfa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 6,
        }}>Photo ID Maker</h1>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13, color: "#52525b",
        }}>Buat pas foto dengan ukuran preset, ganti background, atur posisi wajah, dan cetak lembar siap print.</p>
      </div>

      {/* Upload area */}
      {!imgSrc && (
        <div
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "2px dashed #27272a",
            borderRadius: 16,
            padding: "64px 40px",
            textAlign: "center",
            cursor: "pointer",
            transition: "border-color 0.2s",
            background: "rgba(24,24,27,0.4)",
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "#6366f1"}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = "#27272a"}
        >
          <div style={{ fontSize: 42, marginBottom: 16 }}>📷</div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 15, fontWeight: 600, color: "#a1a1aa", marginBottom: 6,
          }}>Upload foto untuk pas foto</div>
          <div style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 12, color: "#52525b",
          }}>Drag & drop atau klik untuk pilih file</div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onFile}
            style={{ display: "none" }}
          />
        </div>
      )}

      {imgSrc && (
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
          {/* Left: Controls */}
          <div style={{ flex: "0 0 280px", display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Ukuran Preset */}
            <div>
              <div style={{ ...labelStyle, marginBottom: 8 }}>Ukuran Pas Foto</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {PHOTO_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => { setPreset(p); setProcessedSrc(null); setSheetResult(null); }}
                    style={{
                      ...btnBase,
                      fontSize: 12,
                      padding: "8px 12px",
                      textAlign: "left",
                      background: preset.label === p.label ? "rgba(99,102,241,0.15)" : "rgba(24,24,27,0.6)",
                      color: preset.label === p.label ? "#a5b4fc" : "#a1a1aa",
                      border: preset.label === p.label ? "1px solid rgba(99,102,241,0.3)" : "1px solid #27272a",
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{p.label}</span>
                    <span style={{ marginLeft: 8, fontSize: 10, color: "#52525b" }}>{p.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Background Color */}
            <div>
              <div style={{ ...labelStyle, marginBottom: 8 }}>Warna Background</div>
              <div style={{ display: "flex", gap: 8 }}>
                {BG_COLORS.map((bg) => (
                  <button
                    key={bg.label}
                    onClick={() => { setBgColor(bg); setProcessedSrc(null); setSheetResult(null); }}
                    title={bg.label}
                    style={{
                      width: 40, height: 40,
                      borderRadius: 10,
                      border: bgColor.label === bg.label ? "2px solid #6366f1" : "2px solid #27272a",
                      background: bg.value || "repeating-conic-gradient(#2a2a2a 0% 25%, #1a1a1a 0% 50%) 50% / 12px 12px",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      position: "relative",
                    }}
                  >
                    {bgColor.label === bg.label && (
                      <div style={{
                        position: "absolute", inset: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: bg.value === "#ffffff" ? "#333" : "#fff",
                        fontSize: 16, fontWeight: 700,
                      }}>✓</div>
                    )}
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 10, color: "#52525b", marginTop: 4, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                {bgColor.label}
              </div>
            </div>

            {/* Zoom */}
            <div>
              <div style={{ ...labelStyle, marginBottom: 8 }}>Zoom & Posisi Wajah</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: "#52525b" }}>−</span>
                <input
                  type="range" min="0.5" max="3" step="0.05" value={scale}
                  onChange={(e) => { setScale(parseFloat(e.target.value)); setProcessedSrc(null); setSheetResult(null); }}
                  style={{ flex: 1, accentColor: "#6366f1" }}
                />
                <span style={{ fontSize: 11, color: "#52525b" }}>+</span>
              </div>
              <div style={{
                fontSize: 10, color: "#52525b", marginTop: 4,
                fontFamily: "'JetBrains Mono', monospace",
              }}>{Math.round(scale * 100)}%</div>
              <div style={{ fontSize: 10, color: "#3f3f46", marginTop: 4, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Drag foto di preview untuk atur posisi wajah
              </div>
            </div>

            {/* Reset position */}
            <button
              onClick={() => { setOffsetX(0); setOffsetY(0); setScale(1); setProcessedSrc(null); setSheetResult(null); }}
              style={{
                ...btnBase, background: "rgba(24,24,27,0.8)",
                color: "#a1a1aa", border: "1px solid #27272a",
              }}
            >Reset Posisi</button>

            {/* Generate Photo */}
            <button
              onClick={handleGeneratePhoto}
              style={{
                ...btnBase,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff",
                boxShadow: "0 4px 20px rgba(99,102,241,0.3)",
              }}
            >Generate Pas Foto</button>

            {/* Ganti Foto */}
            <button
              onClick={() => {
                if (noBgSrc) URL.revokeObjectURL(noBgSrc);
                setImgSrc(null); setFile(null); setProcessedSrc(null); setSheetResult(null);
                setNoBgSrc(null); setRemovingBg(false); setBgProgress("");
                setScale(1); setOffsetX(0); setOffsetY(0);
              }}
              style={{
                ...btnBase, background: "transparent",
                color: "#52525b", border: "1px solid #27272a",
              }}
            >Ganti Foto</button>
          </div>

          {/* Right: Preview */}
          <div style={{ flex: 1, minWidth: 300 }}>
            {/* Live Preview */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ ...labelStyle, marginBottom: 8 }}>Preview ({preset.label})</div>
              <div style={{
                background: "rgba(24,24,27,0.5)",
                borderRadius: 12,
                border: "1px solid #27272a",
                padding: 20,
                display: "flex",
                justifyContent: "center",
              }}>
                <canvas
                  ref={previewRef}
                  style={{
                    borderRadius: 8,
                    cursor: dragging ? "grabbing" : "grab",
                    maxWidth: "100%",
                    border: "1px solid #27272a",
                  }}
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseLeave={onMouseUp}
                  onTouchStart={onTouchStart}
                  onTouchMove={onTouchMove}
                  onTouchEnd={onMouseUp}
                />
              </div>
              {/* BG Removal status */}
              {removingBg && (
                <div style={{
                  marginTop: 10, padding: "10px 14px",
                  background: "rgba(99,102,241,0.1)",
                  border: "1px solid rgba(99,102,241,0.2)",
                  borderRadius: 8,
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{
                    width: 18, height: 18, border: "2px solid #6366f1",
                    borderTopColor: "transparent", borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }} />
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  <span style={{ fontSize: 12, color: "#a5b4fc", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {bgProgress}
                  </span>
                </div>
              )}
              {!removingBg && bgProgress && (
                <div style={{
                  marginTop: 10, padding: "10px 14px",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 8, fontSize: 12, color: "#f87171",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}>{bgProgress}</div>
              )}
              {!removingBg && noBgSrc && (
                <div style={{
                  marginTop: 10, padding: "10px 14px",
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  borderRadius: 8, fontSize: 12, color: "#4ade80",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}>Background berhasil dihapus. Pilih warna background baru.</div>
              )}
            </div>

            {/* Processed result */}
            {processedSrc && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Hasil Pas Foto</div>
                <div style={{
                  background: "rgba(24,24,27,0.5)",
                  borderRadius: 12,
                  border: "1px solid #1e3a1e",
                  padding: 20,
                }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <img
                      src={processedSrc}
                      alt="Hasil pas foto"
                      style={{ maxHeight: 250, borderRadius: 8, border: "1px solid #27272a" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      onClick={() => downloadImage(processedSrc, `pasfoto_${preset.label.replace(/\s/g, '_')}.jpg`)}
                      style={{
                        ...btnBase, flex: 1,
                        background: "rgba(34,197,94,0.12)", color: "#4ade80",
                        border: "1px solid rgba(34,197,94,0.2)",
                      }}
                    >Download Pas Foto</button>
                  </div>

                  {/* Sheet Generator */}
                  <div style={{
                    marginTop: 16, paddingTop: 16,
                    borderTop: "1px solid #27272a",
                  }}>
                    <div style={{ ...labelStyle, marginBottom: 8 }}>Cetak Lembar Pas Foto</div>
                    <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                      {PRINT_SHEETS.map((s) => (
                        <button
                          key={s.label}
                          onClick={() => { setSheet(s); setSheetResult(null); }}
                          style={{
                            ...btnBase, flex: 1,
                            fontSize: 12, padding: "8px 10px",
                            background: sheet.label === s.label ? "rgba(99,102,241,0.15)" : "rgba(24,24,27,0.6)",
                            color: sheet.label === s.label ? "#a5b4fc" : "#a1a1aa",
                            border: sheet.label === s.label ? "1px solid rgba(99,102,241,0.3)" : "1px solid #27272a",
                          }}
                        >
                          <div>{s.label}</div>
                          <div style={{ fontSize: 10, color: "#52525b" }}>{s.desc}</div>
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={handleGenerateSheet}
                      style={{
                        ...btnBase, width: "100%",
                        background: "linear-gradient(135deg, #f59e0b, #d97706)",
                        color: "#fff",
                        boxShadow: "0 4px 20px rgba(245,158,11,0.3)",
                      }}
                    >Generate Lembar Cetak ({sheet.label})</button>
                  </div>
                </div>
              </div>
            )}

            {/* Sheet result */}
            {sheetResult && (
              <div>
                <div style={{ ...labelStyle, marginBottom: 8 }}>
                  Lembar Cetak {sheet.label} — {sheetResult.count} foto ({sheetResult.cols}x{sheetResult.rows})
                </div>
                <div style={{
                  background: "rgba(24,24,27,0.5)",
                  borderRadius: 12,
                  border: "1px solid #1e3a1e",
                  padding: 20,
                }}>
                  <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
                    <img
                      src={sheetResult.dataUrl}
                      alt="Lembar cetak"
                      style={{ maxWidth: "100%", maxHeight: 400, borderRadius: 8, border: "1px solid #27272a" }}
                    />
                  </div>
                  <button
                    onClick={() => downloadImage(sheetResult.dataUrl, `lembar_cetak_${sheet.label.replace(/\s/g, '_')}_${preset.label.replace(/\s/g, '_')}.jpg`)}
                    style={{
                      ...btnBase, width: "100%",
                      background: "rgba(34,197,94,0.12)", color: "#4ade80",
                      border: "1px solid rgba(34,197,94,0.2)",
                    }}
                  >Download Lembar Cetak</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
