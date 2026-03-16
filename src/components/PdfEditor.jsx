import { useState, useRef, useEffect, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

// ── Styles ──────────────────────────────────────────
const labelStyle = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 12, fontWeight: 600, color: "#a1a1aa",
  letterSpacing: "0.03em",
};
const btnBase = {
  fontFamily: "'Plus Jakarta Sans', sans-serif",
  fontSize: 12, fontWeight: 600,
  border: "none", borderRadius: 8,
  cursor: "pointer", transition: "all 0.15s",
  padding: "8px 14px",
};
const toolBtn = (active) => ({
  ...btnBase,
  background: active ? "rgba(99,102,241,0.18)" : "rgba(24,24,27,0.6)",
  color: active ? "#a5b4fc" : "#a1a1aa",
  border: active ? "1px solid rgba(99,102,241,0.35)" : "1px solid #27272a",
  display: "flex", alignItems: "center", gap: 6, fontSize: 11,
});

// ── Element types ───────────────────────────────────
const TOOLS = [
  { id: "select", label: "Select", icon: "👆" },
  { id: "text", label: "Text", icon: "T" },
  { id: "signature", label: "Signature", icon: "✍️" },
  { id: "checkbox", label: "Checkbox", icon: "☑" },
  { id: "date", label: "Date", icon: "📅" },
  { id: "highlight", label: "Highlight", icon: "🟡" },
  { id: "rect", label: "Rectangle", icon: "▭" },
];

function hexToRgb01(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

function uid() { return Math.random().toString(36).slice(2, 9); }

// ── Signature pad (modal) ───────────────────────────
function SignaturePad({ onDone, onCancel }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [mode, setMode] = useState("draw"); // draw | type | upload
  const [typedName, setTypedName] = useState("");
  const lastPos = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  }, [mode]);

  function startDraw(e) {
    if (mode !== "draw") return;
    setDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    lastPos.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function draw(e) {
    if (!drawing || mode !== "draw") return;
    const c = canvasRef.current;
    const ctx = c.getContext("2d");
    const rect = c.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(x, y);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    lastPos.current = { x, y };
  }
  function endDraw() { setDrawing(false); }
  function clearPad() {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
  }

  function finish() {
    if (mode === "type") {
      // render typed name to canvas
      const c = document.createElement("canvas");
      c.width = 300; c.height = 80;
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, 300, 80);
      ctx.fillStyle = "#000";
      ctx.font = "italic 32px 'Georgia', serif";
      ctx.textBaseline = "middle";
      ctx.fillText(typedName || "Signature", 10, 40);
      onDone(c.toDataURL("image/png"));
    } else {
      onDone(canvasRef.current.toDataURL("image/png"));
    }
  }

  function onUpload(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = (ev) => onDone(ev.target.result);
    reader.readAsDataURL(f);
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9999,
      background: "rgba(0,0,0,0.7)", display: "flex",
      alignItems: "center", justifyContent: "center",
    }} onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} style={{
        background: "#18181b", borderRadius: 16, padding: 24,
        border: "1px solid #27272a", width: 380,
      }}>
        <div style={{ ...labelStyle, marginBottom: 12, fontSize: 14 }}>Tanda Tangan</div>
        {/* Mode tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {[{ k: "draw", l: "Gambar" }, { k: "type", l: "Ketik" }, { k: "upload", l: "Upload" }].map((m) => (
            <button key={m.k} onClick={() => setMode(m.k)} style={toolBtn(mode === m.k)}>{m.l}</button>
          ))}
        </div>

        {mode === "draw" && (
          <>
            <canvas ref={canvasRef} width={340} height={120}
              style={{ borderRadius: 8, border: "1px solid #27272a", cursor: "crosshair", display: "block", background: "#fff" }}
              onMouseDown={startDraw} onMouseMove={draw} onMouseUp={endDraw} onMouseLeave={endDraw}
            />
            <button onClick={clearPad} style={{ ...btnBase, marginTop: 8, background: "rgba(24,24,27,0.8)", color: "#a1a1aa", border: "1px solid #27272a" }}>Clear</button>
          </>
        )}
        {mode === "type" && (
          <input value={typedName} onChange={(e) => setTypedName(e.target.value)}
            placeholder="Nama Anda..." autoFocus
            style={{
              width: "100%", padding: "12px 16px", borderRadius: 8,
              background: "#0d0d12", border: "1px solid #27272a", color: "#e4e4e7",
              fontFamily: "'Georgia', serif", fontStyle: "italic", fontSize: 24, outline: "none",
            }}
          />
        )}
        {mode === "upload" && (
          <div style={{ textAlign: "center", padding: 20 }}>
            <input type="file" accept="image/*" onChange={onUpload} style={{ color: "#a1a1aa" }} />
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
          <button onClick={onCancel} style={{ ...btnBase, background: "rgba(24,24,27,0.8)", color: "#a1a1aa", border: "1px solid #27272a" }}>Batal</button>
          {mode !== "upload" && (
            <button onClick={finish} style={{ ...btnBase, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff" }}>Simpan</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Draggable Element on Canvas ─────────────────────
function DraggableElement({ el, selected, zoom, onSelect, onUpdate, onDelete }) {
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const startRef = useRef({});

  function onMouseDown(e) {
    e.stopPropagation();
    onSelect();
    setDragging(true);
    startRef.current = { mx: e.clientX, my: e.clientY, x: el.x, y: el.y };
  }
  function onResizeDown(e) {
    e.stopPropagation();
    onSelect();
    setResizing(true);
    startRef.current = { mx: e.clientX, my: e.clientY, w: el.w, h: el.h };
  }

  useEffect(() => {
    if (!dragging && !resizing) return;
    function onMove(e) {
      const dx = (e.clientX - startRef.current.mx) / zoom;
      const dy = (e.clientY - startRef.current.my) / zoom;
      if (dragging) onUpdate({ x: startRef.current.x + dx, y: startRef.current.y + dy });
      if (resizing) onUpdate({ w: Math.max(20, startRef.current.w + dx), h: Math.max(10, startRef.current.h + dy) });
    }
    function onUp() { setDragging(false); setResizing(false); }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, resizing]);

  const baseStyle = {
    position: "absolute",
    left: el.x * zoom, top: el.y * zoom,
    width: el.w * zoom, height: el.h * zoom,
    cursor: dragging ? "grabbing" : "grab",
    outline: selected ? "2px solid #6366f1" : "none",
    borderRadius: 2,
    zIndex: selected ? 10 : 1,
  };

  let content;
  if (el.type === "text") {
    content = (
      <div style={{
        ...baseStyle, display: "flex", alignItems: "center", padding: "0 4px",
        color: el.color || "#000", fontSize: (el.fontSize || 14) * zoom,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        background: selected ? "rgba(99,102,241,0.08)" : "transparent",
      }} onMouseDown={onMouseDown}>
        {el.content || "Text"}
      </div>
    );
  } else if (el.type === "signature") {
    content = (
      <div style={{ ...baseStyle, background: selected ? "rgba(99,102,241,0.08)" : "transparent" }} onMouseDown={onMouseDown}>
        <img src={el.imgData} alt="sig" style={{ width: "100%", height: "100%", objectFit: "contain" }} draggable={false} />
      </div>
    );
  } else if (el.type === "checkbox") {
    content = (
      <div style={{
        ...baseStyle, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 16 * zoom, cursor: "pointer",
        background: selected ? "rgba(99,102,241,0.08)" : "transparent",
      }} onMouseDown={onMouseDown} onDoubleClick={(e) => { e.stopPropagation(); onUpdate({ checked: !el.checked }); }}>
        {el.checked ? "☑" : "☐"}
      </div>
    );
  } else if (el.type === "date") {
    content = (
      <div style={{
        ...baseStyle, display: "flex", alignItems: "center", padding: "0 4px",
        fontSize: (el.fontSize || 12) * zoom, color: el.color || "#000",
        fontFamily: "'JetBrains Mono', monospace",
        background: selected ? "rgba(99,102,241,0.08)" : "transparent",
      }} onMouseDown={onMouseDown}>
        {el.content || new Date().toLocaleDateString("id-ID")}
      </div>
    );
  } else if (el.type === "highlight") {
    content = (
      <div style={{
        ...baseStyle,
        background: el.color || "rgba(255,255,0,0.35)",
        borderRadius: 2,
      }} onMouseDown={onMouseDown} />
    );
  } else if (el.type === "rect") {
    content = (
      <div style={{
        ...baseStyle,
        border: `${2 * zoom}px solid ${el.color || "#ef4444"}`,
        background: "transparent",
        borderRadius: 3,
      }} onMouseDown={onMouseDown} />
    );
  }

  return (
    <>
      {content}
      {selected && (
        <>
          {/* Resize handle */}
          <div
            onMouseDown={onResizeDown}
            style={{
              position: "absolute",
              left: (el.x + el.w) * zoom - 5, top: (el.y + el.h) * zoom - 5,
              width: 10, height: 10, background: "#6366f1", borderRadius: 2,
              cursor: "nwse-resize", zIndex: 20,
            }}
          />
          {/* Delete btn */}
          <div
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              position: "absolute",
              left: (el.x + el.w) * zoom - 8, top: el.y * zoom - 8,
              width: 18, height: 18, borderRadius: 9,
              background: "#ef4444", color: "#fff",
              fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", zIndex: 20, fontWeight: 700,
            }}
          >×</div>
        </>
      )}
    </>
  );
}

// ── Main Component ──────────────────────────────────
export default function PdfEditor() {
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageImages, setPageImages] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [tool, setTool] = useState("select");
  const [elements, setElements] = useState({}); // { pageNum: [el, ...] }
  const [selectedId, setSelectedId] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [showSigPad, setShowSigPad] = useState(false);
  const [pendingSigPos, setPendingSigPos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fileName, setFileName] = useState("");
  // Props for new elements
  const [textContent, setTextContent] = useState("Text");
  const [fontSize, setFontSize] = useState(14);
  const [elColor, setElColor] = useState("#000000");
  const [highlightColor, setHighlightColor] = useState("rgba(255,255,0,0.35)");

  const fileInputRef = useRef(null);
  const containerRef = useRef(null);

  // ── History management ──
  function pushHistory(newElements) {
    const newHistory = history.slice(0, historyIdx + 1);
    newHistory.push(JSON.parse(JSON.stringify(newElements)));
    setHistory(newHistory);
    setHistoryIdx(newHistory.length - 1);
  }

  function undo() {
    if (historyIdx <= 0) return;
    const prev = history[historyIdx - 1];
    setElements(JSON.parse(JSON.stringify(prev)));
    setHistoryIdx(historyIdx - 1);
    setSelectedId(null);
  }

  function redo() {
    if (historyIdx >= history.length - 1) return;
    const next = history[historyIdx + 1];
    setElements(JSON.parse(JSON.stringify(next)));
    setHistoryIdx(historyIdx + 1);
    setSelectedId(null);
  }

  // ── Keyboard shortcuts ──
  useEffect(() => {
    function onKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedId && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          deleteElement(selectedId);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [historyIdx, history, selectedId, elements]);

  // ── Load PDF ──
  async function onFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setLoading(true);
    setFileName(f.name);
    const bytes = await f.arrayBuffer();
    setPdfBytes(new Uint8Array(bytes));

    const doc = await pdfjsLib.getDocument({ data: bytes.slice(0) }).promise;
    setPdfDoc(doc);
    setTotalPages(doc.numPages);
    setCurrentPage(0);

    // Render all pages
    const images = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 2 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
      images.push({
        dataUrl: canvas.toDataURL("image/png"),
        width: viewport.width / 2,
        height: viewport.height / 2,
      });
    }
    setPageImages(images);

    const initEls = {};
    for (let i = 0; i < doc.numPages; i++) initEls[i] = [];
    setElements(initEls);
    pushHistory(initEls);
    setSelectedId(null);
    setLoading(false);
  }

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f || f.type !== "application/pdf") return;
    const dt = new DataTransfer();
    dt.items.add(f);
    fileInputRef.current.files = dt.files;
    fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
  }, []);

  // ── Add element on canvas click ──
  function onCanvasClick(e) {
    if (tool === "select") { setSelectedId(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    if (tool === "signature") {
      setPendingSigPos({ x, y });
      setShowSigPad(true);
      return;
    }

    let newEl;
    if (tool === "text") {
      newEl = { id: uid(), type: "text", x, y, w: 150, h: 24, content: textContent, fontSize, color: elColor };
    } else if (tool === "checkbox") {
      newEl = { id: uid(), type: "checkbox", x, y, w: 22, h: 22, checked: false };
    } else if (tool === "date") {
      newEl = { id: uid(), type: "date", x, y, w: 130, h: 22, content: new Date().toLocaleDateString("id-ID"), fontSize: 12, color: elColor };
    } else if (tool === "highlight") {
      newEl = { id: uid(), type: "highlight", x, y, w: 160, h: 20, color: highlightColor };
    } else if (tool === "rect") {
      newEl = { id: uid(), type: "rect", x, y, w: 120, h: 60, color: elColor };
    }

    if (newEl) {
      const updated = { ...elements, [currentPage]: [...(elements[currentPage] || []), newEl] };
      setElements(updated);
      pushHistory(updated);
      setSelectedId(newEl.id);
    }
  }

  function onSignatureDone(imgData) {
    setShowSigPad(false);
    if (!pendingSigPos) return;
    const newEl = {
      id: uid(), type: "signature",
      x: pendingSigPos.x, y: pendingSigPos.y,
      w: 150, h: 50, imgData,
    };
    const updated = { ...elements, [currentPage]: [...(elements[currentPage] || []), newEl] };
    setElements(updated);
    pushHistory(updated);
    setSelectedId(newEl.id);
    setPendingSigPos(null);
  }

  function updateElement(id, props) {
    const pageEls = (elements[currentPage] || []).map((el) =>
      el.id === id ? { ...el, ...props } : el
    );
    const updated = { ...elements, [currentPage]: pageEls };
    setElements(updated);
    // Only push history on mouseup (handled by DraggableElement)
  }

  function commitElement() {
    pushHistory(elements);
  }

  function deleteElement(id) {
    const pageEls = (elements[currentPage] || []).filter((el) => el.id !== id);
    const updated = { ...elements, [currentPage]: pageEls };
    setElements(updated);
    pushHistory(updated);
    setSelectedId(null);
  }

  // ── Selected element for property editing ──
  const selectedEl = (elements[currentPage] || []).find((el) => el.id === selectedId);

  function updateSelectedProp(props) {
    if (!selectedId) return;
    updateElement(selectedId, props);
    pushHistory({ ...elements, [currentPage]: (elements[currentPage] || []).map((el) => el.id === selectedId ? { ...el, ...props } : el) });
  }

  // ── Generate final PDF ──
  async function savePdf() {
    if (!pdfBytes) return;
    setSaving(true);
    try {
      const doc = await PDFDocument.load(pdfBytes);
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const pages = doc.getPages();

      for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
        const page = pages[pageIdx];
        const { height } = page.getSize();
        const els = elements[pageIdx] || [];

        for (const el of els) {
          const pdfY = height - el.y - el.h; // flip Y

          if (el.type === "text" || el.type === "date") {
            const c = hexToRgb01(el.color || "#000000");
            page.drawText(el.content || "", {
              x: el.x, y: pdfY + 4,
              size: el.fontSize || 14,
              font,
              color: rgb(c.r, c.g, c.b),
            });
          } else if (el.type === "checkbox") {
            const c = hexToRgb01("#000000");
            page.drawText(el.checked ? "X" : "O", {
              x: el.x + 3, y: pdfY + 4,
              size: 14, font, color: rgb(c.r, c.g, c.b),
            });
          } else if (el.type === "signature") {
            try {
              const imgBytes = await fetch(el.imgData).then((r) => r.arrayBuffer());
              const img = await doc.embedPng(imgBytes);
              page.drawImage(img, {
                x: el.x, y: pdfY,
                width: el.w, height: el.h,
              });
            } catch (err) {
              console.warn("Failed to embed signature:", err);
            }
          } else if (el.type === "highlight") {
            page.drawRectangle({
              x: el.x, y: pdfY,
              width: el.w, height: el.h,
              color: rgb(1, 1, 0),
              opacity: 0.35,
            });
          } else if (el.type === "rect") {
            const c = hexToRgb01(el.color || "#ef4444");
            page.drawRectangle({
              x: el.x, y: pdfY,
              width: el.w, height: el.h,
              borderColor: rgb(c.r, c.g, c.b),
              borderWidth: 2,
            });
          }
        }
      }

      const finalBytes = await doc.save();
      const blob = new Blob([finalBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName.replace(/\.pdf$/i, "") + "_edited.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Save failed:", err);
      alert("Gagal menyimpan PDF: " + err.message);
    }
    setSaving(false);
  }

  const pageImg = pageImages[currentPage];
  const currentEls = elements[currentPage] || [];

  // ── Render ──
  return (
    <div style={{ padding: "24px 28px", maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 22, fontWeight: 700,
          background: "linear-gradient(135deg, #6366f1, #a78bfa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 6,
        }}>PDF Editor</h1>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13, color: "#52525b",
        }}>Edit PDF: tambah teks, tanda tangan, checkbox, tanggal, highlight, dan shapes.</p>
      </div>

      {/* Upload area */}
      {!pdfBytes && (
        <div
          onDrop={onDrop} onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: "2px dashed #27272a", borderRadius: 16,
            padding: "64px 40px", textAlign: "center",
            cursor: "pointer", background: "rgba(24,24,27,0.4)",
            transition: "border-color 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = "#6366f1"}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = "#27272a"}
        >
          <div style={{ fontSize: 42, marginBottom: 16 }}>{loading ? "⏳" : "📝"}</div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, fontWeight: 600, color: "#a1a1aa", marginBottom: 6 }}>
            {loading ? "Memuat PDF..." : "Upload PDF untuk diedit"}
          </div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 12, color: "#52525b" }}>
            Drag & drop atau klik untuk pilih file
          </div>
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" onChange={onFile} style={{ display: "none" }} />
        </div>
      )}

      {pdfBytes && pageImg && (
        <>
          {/* Toolbar */}
          <div style={{
            display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap",
            padding: "10px 14px", borderRadius: 10,
            background: "rgba(14,14,20,0.7)", border: "1px solid #1e1e2a",
            alignItems: "center",
          }}>
            {/* Tools */}
            {TOOLS.map((t) => (
              <button key={t.id} onClick={() => setTool(t.id)} style={toolBtn(tool === t.id)}>
                <span>{t.icon}</span> {t.label}
              </button>
            ))}

            <div style={{ width: 1, height: 24, background: "#27272a", margin: "0 4px" }} />

            {/* Undo/Redo */}
            <button onClick={undo} disabled={historyIdx <= 0}
              style={{ ...btnBase, fontSize: 14, padding: "6px 10px", background: "transparent", color: historyIdx <= 0 ? "#27272a" : "#a1a1aa", border: "none" }}
              title="Undo (Ctrl+Z)">↩</button>
            <button onClick={redo} disabled={historyIdx >= history.length - 1}
              style={{ ...btnBase, fontSize: 14, padding: "6px 10px", background: "transparent", color: historyIdx >= history.length - 1 ? "#27272a" : "#a1a1aa", border: "none" }}
              title="Redo (Ctrl+Shift+Z)">↪</button>

            <div style={{ width: 1, height: 24, background: "#27272a", margin: "0 4px" }} />

            {/* Zoom */}
            <button onClick={() => setZoom((z) => Math.max(0.25, z - 0.25))}
              style={{ ...btnBase, fontSize: 14, padding: "6px 10px", background: "transparent", color: "#a1a1aa", border: "none" }}>−</button>
            <span style={{ fontSize: 11, color: "#a1a1aa", fontFamily: "'JetBrains Mono', monospace", minWidth: 40, textAlign: "center" }}>
              {Math.round(zoom * 100)}%
            </span>
            <button onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
              style={{ ...btnBase, fontSize: 14, padding: "6px 10px", background: "transparent", color: "#a1a1aa", border: "none" }}>+</button>

            <div style={{ flex: 1 }} />

            {/* Save */}
            <button onClick={savePdf} disabled={saving}
              style={{ ...btnBase, background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", padding: "8px 18px" }}>
              {saving ? "Menyimpan..." : "Download PDF"}
            </button>
            {/* New file */}
            <button onClick={() => { setPdfBytes(null); setPdfDoc(null); setPageImages([]); setElements({}); setHistory([]); setHistoryIdx(-1); setSelectedId(null); }}
              style={{ ...btnBase, background: "rgba(24,24,27,0.8)", color: "#a1a1aa", border: "1px solid #27272a" }}>
              File Baru
            </button>
          </div>

          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            {/* Properties panel (when element selected or tool active) */}
            <div style={{
              flex: "0 0 200px", padding: 14, borderRadius: 10,
              background: "rgba(24,24,27,0.5)", border: "1px solid #27272a",
              display: "flex", flexDirection: "column", gap: 12,
              alignSelf: "flex-start",
            }}>
              <div style={labelStyle}>Properti</div>

              {(tool === "text" || tool === "date" || (selectedEl && (selectedEl.type === "text" || selectedEl.type === "date"))) && (
                <>
                  <div>
                    <div style={{ fontSize: 10, color: "#52525b", marginBottom: 4 }}>Teks</div>
                    <input
                      value={selectedEl ? selectedEl.content : textContent}
                      onChange={(e) => {
                        if (selectedEl) updateSelectedProp({ content: e.target.value });
                        else setTextContent(e.target.value);
                      }}
                      style={{
                        width: "100%", padding: "6px 10px", borderRadius: 6,
                        background: "#0d0d12", border: "1px solid #27272a",
                        color: "#e4e4e7", fontSize: 12, outline: "none",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: "#52525b", marginBottom: 4 }}>Font Size</div>
                    <input type="number" min={6} max={72}
                      value={selectedEl ? selectedEl.fontSize : fontSize}
                      onChange={(e) => {
                        const v = parseInt(e.target.value) || 14;
                        if (selectedEl) updateSelectedProp({ fontSize: v });
                        else setFontSize(v);
                      }}
                      style={{
                        width: "100%", padding: "6px 10px", borderRadius: 6,
                        background: "#0d0d12", border: "1px solid #27272a",
                        color: "#e4e4e7", fontSize: 12, outline: "none",
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    />
                  </div>
                </>
              )}

              {(tool !== "select" || selectedEl) && (
                <div>
                  <div style={{ fontSize: 10, color: "#52525b", marginBottom: 4 }}>Warna</div>
                  <input type="color"
                    value={selectedEl?.color?.startsWith("#") ? selectedEl.color : elColor}
                    onChange={(e) => {
                      if (selectedEl) updateSelectedProp({ color: e.target.value });
                      else setElColor(e.target.value);
                    }}
                    style={{
                      width: "100%", height: 32, borderRadius: 6,
                      background: "#0d0d12", border: "1px solid #27272a",
                      cursor: "pointer",
                    }}
                  />
                </div>
              )}

              {!selectedEl && tool === "select" && (
                <div style={{ fontSize: 11, color: "#3f3f46", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Pilih tool lalu klik di PDF untuk menambah elemen, atau klik elemen untuk mengedit.
                </div>
              )}

              {/* Page nav */}
              <div style={{ marginTop: 8, borderTop: "1px solid #27272a", paddingTop: 12 }}>
                <div style={{ ...labelStyle, marginBottom: 8 }}>Halaman</div>
                <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "center" }}>
                  <button onClick={() => setCurrentPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}
                    style={{ ...btnBase, padding: "4px 10px", background: "rgba(24,24,27,0.8)", color: currentPage === 0 ? "#27272a" : "#a1a1aa", border: "1px solid #27272a" }}>◀</button>
                  <span style={{ fontSize: 12, color: "#a1a1aa", fontFamily: "'JetBrains Mono', monospace" }}>
                    {currentPage + 1} / {totalPages}
                  </span>
                  <button onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))} disabled={currentPage >= totalPages - 1}
                    style={{ ...btnBase, padding: "4px 10px", background: "rgba(24,24,27,0.8)", color: currentPage >= totalPages - 1 ? "#27272a" : "#a1a1aa", border: "1px solid #27272a" }}>▶</button>
                </div>
              </div>

              {/* Page thumbnails */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 300, overflowY: "auto" }}>
                {pageImages.map((img, i) => (
                  <div key={i} onClick={() => setCurrentPage(i)}
                    style={{
                      padding: 3, borderRadius: 6, cursor: "pointer",
                      border: i === currentPage ? "2px solid #6366f1" : "2px solid transparent",
                      background: i === currentPage ? "rgba(99,102,241,0.08)" : "transparent",
                    }}>
                    <img src={img.dataUrl} alt={`p${i + 1}`}
                      style={{ width: "100%", borderRadius: 4, display: "block" }} />
                    <div style={{ fontSize: 9, textAlign: "center", color: "#52525b", marginTop: 2 }}>
                      {i + 1}{(elements[i] || []).length > 0 ? ` (${(elements[i] || []).length})` : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Canvas area */}
            <div style={{ flex: 1, overflow: "auto" }}>
              <div
                ref={containerRef}
                onClick={onCanvasClick}
                style={{
                  position: "relative",
                  width: pageImg.width * zoom,
                  height: pageImg.height * zoom,
                  margin: "0 auto",
                  boxShadow: "0 4px 30px rgba(0,0,0,0.5)",
                  borderRadius: 4,
                  cursor: tool !== "select" ? "crosshair" : "default",
                }}
              >
                <img
                  src={pageImg.dataUrl}
                  alt={`Page ${currentPage + 1}`}
                  style={{
                    width: pageImg.width * zoom,
                    height: pageImg.height * zoom,
                    display: "block",
                    borderRadius: 4,
                    userSelect: "none",
                  }}
                  draggable={false}
                />
                {/* Render elements */}
                {currentEls.map((el) => (
                  <DraggableElement
                    key={el.id}
                    el={el}
                    selected={selectedId === el.id}
                    zoom={zoom}
                    onSelect={() => { setSelectedId(el.id); setTool("select"); }}
                    onUpdate={(props) => updateElement(el.id, props)}
                    onDelete={() => deleteElement(el.id)}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Signature modal */}
      {showSigPad && (
        <SignaturePad
          onDone={onSignatureDone}
          onCancel={() => { setShowSigPad(false); setPendingSigPos(null); }}
        />
      )}
    </div>
  );
}
