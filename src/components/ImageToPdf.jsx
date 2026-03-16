import { useState, useRef, useCallback } from "react";

const PAGE_SIZES = [
  { label: "A4", w: 210, h: 297 },
  { label: "A5", w: 148, h: 210 },
  { label: "Letter", w: 216, h: 279 },
  { label: "Legal", w: 216, h: 356 },
  { label: "F4 / Folio", w: 215, h: 330 },
];

const FIT_MODES = [
  { id: "contain", label: "Fit (muat utuh)", desc: "Gambar utuh, ada margin" },
  { id: "cover", label: "Fill (penuh)", desc: "Penuh halaman, bisa terpotong" },
  { id: "stretch", label: "Stretch", desc: "Tarik sesuai halaman" },
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

function loadImage(file) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ file, url, img, w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export default function ImageToPdf() {
  const [images, setImages] = useState([]);
  const [pageSize, setPageSize] = useState(0);
  const [orientation, setOrientation] = useState("portrait");
  const [fitMode, setFitMode] = useState("contain");
  const [margin, setMargin] = useState(10);
  const [processing, setProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);
  const inputRef = useRef(null);

  const addFiles = useCallback(async (files) => {
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith("image/"));
    const loaded = await Promise.all(imageFiles.map(loadImage));
    const valid = loaded.filter(Boolean);
    setImages((prev) => [...prev, ...valid]);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    addFiles(e.dataTransfer?.files);
  }, [addFiles]);

  const removeImage = (idx) => {
    setImages((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[idx].url);
      copy.splice(idx, 1);
      return copy;
    });
  };

  const moveImage = (from, to) => {
    if (from === to) return;
    setImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  };

  const handleDragStart = (idx) => (e) => {
    setDragIdx(idx);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverItem = (idx) => (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverIdx(idx);
  };

  const handleDropItem = (idx) => (e) => {
    e.preventDefault();
    if (dragIdx !== null) moveImage(dragIdx, idx);
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const generatePdf = async () => {
    if (images.length === 0) return;
    setProcessing(true);

    try {
      const { jsPDF } = await import("jspdf");

      const ps = PAGE_SIZES[pageSize];
      const pw = orientation === "portrait" ? ps.w : ps.h;
      const ph = orientation === "portrait" ? ps.h : ps.w;

      const doc = new jsPDF({
        orientation: orientation === "portrait" ? "p" : "l",
        unit: "mm",
        format: [pw, ph],
      });

      for (let i = 0; i < images.length; i++) {
        if (i > 0) doc.addPage([pw, ph], orientation === "portrait" ? "p" : "l");

        const item = images[i];
        const imgW = item.w;
        const imgH = item.h;

        const areaW = pw - margin * 2;
        const areaH = ph - margin * 2;

        let drawW, drawH, drawX, drawY;

        if (fitMode === "stretch") {
          drawW = areaW;
          drawH = areaH;
          drawX = margin;
          drawY = margin;
        } else if (fitMode === "contain") {
          const ratioW = areaW / imgW;
          const ratioH = areaH / imgH;
          const ratio = Math.min(ratioW, ratioH);
          drawW = imgW * ratio;
          drawH = imgH * ratio;
          drawX = margin + (areaW - drawW) / 2;
          drawY = margin + (areaH - drawH) / 2;
        } else {
          // cover
          const ratioW = areaW / imgW;
          const ratioH = areaH / imgH;
          const ratio = Math.max(ratioW, ratioH);
          drawW = imgW * ratio;
          drawH = imgH * ratio;
          drawX = margin + (areaW - drawW) / 2;
          drawY = margin + (areaH - drawH) / 2;
        }

        // Convert image to data URL for jspdf
        const canvas = document.createElement("canvas");
        canvas.width = item.w;
        canvas.height = item.h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(item.img, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

        if (fitMode === "cover") {
          // Clip to area
          doc.saveGraphicsState();
          doc.rect(margin, margin, areaW, areaH);
          doc.clip();
          doc.addImage(dataUrl, "JPEG", drawX, drawY, drawW, drawH);
          doc.restoreGraphicsState();
        } else {
          doc.addImage(dataUrl, "JPEG", drawX, drawY, drawW, drawH);
        }
      }

      doc.save("images-merged.pdf");
    } catch (e) {
      console.error(e);
    }
    setProcessing(false);
  };

  const reset = () => {
    images.forEach((item) => URL.revokeObjectURL(item.url));
    setImages([]);
  };

  const ps = PAGE_SIZES[pageSize];
  const previewPageW = orientation === "portrait" ? ps.w : ps.h;
  const previewPageH = orientation === "portrait" ? ps.h : ps.w;

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 20, fontWeight: 700, color: "#e4e4e7",
            display: "flex", alignItems: "center", gap: 8,
          }}>📄 Image to PDF</h2>
          <p style={{ color: "#52525b", fontSize: 12, marginTop: 4, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Gabung beberapa foto jadi satu PDF — untuk scan KTP, dokumen, dll
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? "#6366f1" : "#27272a"}`,
            borderRadius: 16,
            padding: images.length > 0 ? "20px 32px" : "48px 32px",
            textAlign: "center",
            cursor: "pointer",
            background: dragOver ? "rgba(99,102,241,0.05)" : "rgba(24,24,27,0.5)",
            marginBottom: 20,
          }}
        >
          {images.length === 0 ? (
            <>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📸</div>
              <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 16, fontWeight: 600, color: "#a1a1aa" }}>
                Drop foto-foto di sini atau klik untuk upload
              </p>
              <p style={{ color: "#52525b", fontSize: 12, marginTop: 6 }}>Bisa upload banyak sekaligus — JPG, PNG, WebP</p>
            </>
          ) : (
            <p style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 13, color: "#6366f1", fontWeight: 600 }}>
              + Tambah foto lagi
            </p>
          )}
          <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: "none" }}
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
        </div>

        {images.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            {/* Left: Image list + settings */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Image list */}
              <div style={{ background: "rgba(24,24,27,0.6)", border: "1px solid #27272a", borderRadius: 12, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <label style={labelStyle}>🖼️ Foto ({images.length} halaman)</label>
                  <button onClick={reset} style={{
                    background: "rgba(239,68,68,0.1)", color: "#f87171",
                    border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                    fontSize: 10, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600,
                  }}>Hapus Semua</button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 360, overflowY: "auto" }}>
                  {images.map((item, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={handleDragStart(idx)}
                      onDragOver={handleDragOverItem(idx)}
                      onDrop={handleDropItem(idx)}
                      onDragEnd={handleDragEnd}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 10px", borderRadius: 8,
                        background: dragOverIdx === idx ? "rgba(99,102,241,0.15)" :
                          dragIdx === idx ? "rgba(99,102,241,0.08)" : "rgba(24,24,27,0.5)",
                        border: dragOverIdx === idx ? "1px solid #6366f1" : "1px solid #1e1e2a",
                        cursor: "grab",
                        transition: "all 0.15s",
                        opacity: dragIdx === idx ? 0.5 : 1,
                      }}
                    >
                      <span style={{ color: "#3f3f46", fontSize: 14, cursor: "grab" }}>⠿</span>
                      <img src={item.url} alt="" style={{
                        width: 40, height: 40, objectFit: "cover", borderRadius: 4,
                        border: "1px solid #27272a",
                      }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                          color: "#a1a1aa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>{item.file.name}</div>
                        <div style={{ fontSize: 10, color: "#52525b", fontFamily: "'JetBrains Mono', monospace" }}>
                          {item.w}×{item.h} · {formatBytes(item.file.size)}
                        </div>
                      </div>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
                        color: "#52525b", minWidth: 18, textAlign: "center",
                      }}>#{idx + 1}</span>
                      <button onClick={(e) => { e.stopPropagation(); removeImage(idx); }} style={{
                        background: "none", border: "none", color: "#52525b",
                        cursor: "pointer", fontSize: 14, padding: "0 4px",
                      }}>✕</button>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: 10, color: "#3f3f46", marginTop: 8 }}>💡 Drag untuk mengubah urutan halaman</p>
              </div>

              {/* Page size */}
              <div style={{ background: "rgba(24,24,27,0.6)", border: "1px solid #27272a", borderRadius: 12, padding: 16 }}>
                <label style={labelStyle}>📐 Ukuran Kertas</label>
                <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                  {PAGE_SIZES.map((ps, i) => (
                    <button key={i} onClick={() => setPageSize(i)} style={{
                      padding: "7px 14px", borderRadius: 8,
                      border: pageSize === i ? "1px solid #6366f1" : "1px solid #27272a",
                      background: pageSize === i ? "rgba(99,102,241,0.15)" : "rgba(24,24,27,0.4)",
                      color: pageSize === i ? "#a5b4fc" : "#a1a1aa",
                      cursor: "pointer", fontSize: 12,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      fontWeight: pageSize === i ? 600 : 400,
                    }}>
                      {ps.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation */}
              <div style={{ background: "rgba(24,24,27,0.6)", border: "1px solid #27272a", borderRadius: 12, padding: 16 }}>
                <label style={labelStyle}>🔄 Orientasi</label>
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  {[["portrait", "Portrait"], ["landscape", "Landscape"]].map(([val, lbl]) => (
                    <button key={val} onClick={() => setOrientation(val)} style={{
                      flex: 1, padding: "8px 0", borderRadius: 8,
                      border: orientation === val ? "1px solid #6366f1" : "1px solid #27272a",
                      background: orientation === val ? "rgba(99,102,241,0.15)" : "rgba(24,24,27,0.4)",
                      color: orientation === val ? "#a5b4fc" : "#71717a",
                      cursor: "pointer", fontSize: 13, fontWeight: 600,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}>{val === "portrait" ? "📱" : "🖥️"} {lbl}</button>
                  ))}
                </div>
              </div>

              {/* Fit mode */}
              <div style={{ background: "rgba(24,24,27,0.6)", border: "1px solid #27272a", borderRadius: 12, padding: 16 }}>
                <label style={labelStyle}>🖼️ Mode Gambar</label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
                  {FIT_MODES.map((fm) => (
                    <button key={fm.id} onClick={() => setFitMode(fm.id)} style={{
                      padding: "8px 12px", borderRadius: 8, textAlign: "left",
                      border: fitMode === fm.id ? "1px solid #6366f1" : "1px solid #27272a",
                      background: fitMode === fm.id ? "rgba(99,102,241,0.15)" : "rgba(24,24,27,0.4)",
                      cursor: "pointer",
                    }}>
                      <div style={{
                        fontSize: 12, fontWeight: fitMode === fm.id ? 600 : 400,
                        color: fitMode === fm.id ? "#a5b4fc" : "#a1a1aa",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}>{fm.label}</div>
                      <div style={{ fontSize: 10, color: "#52525b", marginTop: 2 }}>{fm.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Margin */}
              <div style={{ background: "rgba(24,24,27,0.6)", border: "1px solid #27272a", borderRadius: 12, padding: 16 }}>
                <label style={labelStyle}>📏 Margin: {margin} mm</label>
                <input type="range" min="0" max="30" value={margin}
                  onChange={(e) => setMargin(Number(e.target.value))}
                  style={{ width: "100%", marginTop: 8, accentColor: "#6366f1" }} />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#3f3f46" }}>
                  <span>0 mm</span><span>30 mm</span>
                </div>
              </div>

              {/* Generate */}
              <button onClick={generatePdf} disabled={processing} style={{
                padding: "14px 0", borderRadius: 12, border: "none",
                background: processing ? "rgba(99,102,241,0.3)" : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                color: "#fff", fontSize: 15, fontWeight: 700,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                cursor: processing ? "wait" : "pointer",
              }}>
                {processing ? "⏳ Membuat PDF..." : `📄 Generate PDF (${images.length} halaman)`}
              </button>
            </div>

            {/* Right: Preview */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "rgba(24,24,27,0.6)", border: "1px solid #27272a", borderRadius: 12, padding: 16 }}>
                <label style={labelStyle}>👁️ Preview Halaman</label>
                <div style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: previewPageW > previewPageH ? "1fr" : "1fr 1fr",
                  gap: 10,
                  maxHeight: 600,
                  overflowY: "auto",
                }}>
                  {images.map((item, idx) => {
                    const scale = 160 / Math.max(previewPageW, previewPageH);
                    const boxW = previewPageW * scale;
                    const boxH = previewPageH * scale;

                    return (
                      <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                        <div style={{
                          width: boxW, height: boxH,
                          background: "#fff",
                          borderRadius: 4,
                          overflow: "hidden",
                          position: "relative",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                        }}>
                          <div style={{
                            position: "absolute",
                            top: margin * scale,
                            left: margin * scale,
                            right: margin * scale,
                            bottom: margin * scale,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                          }}>
                            <img src={item.url} alt="" style={{
                              ...(fitMode === "contain"
                                ? { maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }
                                : fitMode === "cover"
                                ? { width: "100%", height: "100%", objectFit: "cover" }
                                : { width: "100%", height: "100%", objectFit: "fill" }),
                            }} />
                          </div>
                        </div>
                        <span style={{
                          fontSize: 10, color: "#52525b",
                          fontFamily: "'JetBrains Mono', monospace",
                        }}>#{idx + 1}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Info */}
              <div style={{
                background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.12)",
                borderRadius: 10, padding: "12px 16px",
              }}>
                <div style={{ fontSize: 11, color: "#71717a", fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1.7 }}>
                  📋 <strong style={{ color: "#a1a1aa" }}>{images.length}</strong> halaman ·{" "}
                  <strong style={{ color: "#a1a1aa" }}>{PAGE_SIZES[pageSize].label}</strong> ·{" "}
                  <strong style={{ color: "#a1a1aa" }}>{orientation === "portrait" ? "Portrait" : "Landscape"}</strong> ·{" "}
                  Margin <strong style={{ color: "#a1a1aa" }}>{margin}mm</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
