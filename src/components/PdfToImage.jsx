import { useState, useRef, useCallback } from "react";
import * as pdfjsLib from "pdfjs-dist";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

const SCALES = [
  { label: "72 DPI", value: 1 },
  { label: "150 DPI", value: 2.08 },
  { label: "300 DPI", value: 4.17 },
];

const FORMATS = ["image/png", "image/jpeg"];

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

export default function PdfToImage() {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [scaleIdx, setScaleIdx] = useState(1);
  const [format, setFormat] = useState("image/png");
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef(null);

  const onFile = useCallback(async (e) => {
    const f = e.target.files?.[0];
    if (!f || f.type !== "application/pdf") return;
    setFileName(f.name);
    setLoading(true);
    setPages([]);
    setProgress("Memuat PDF...");

    try {
      const arrayBuffer = await f.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      const total = pdf.numPages;
      const results = [];
      const scale = SCALES[scaleIdx].value;

      for (let i = 1; i <= total; i++) {
        setProgress(`Rendering halaman ${i} / ${total}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement("canvas");
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext("2d");

        if (format === "image/jpeg") {
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        await page.render({ canvasContext: ctx, viewport }).promise;
        const dataUrl = canvas.toDataURL(format, format === "image/jpeg" ? 0.92 : undefined);
        results.push({ dataUrl, width: canvas.width, height: canvas.height, pageNum: i });
      }

      setPages(results);
      setProgress("");
    } catch (err) {
      console.error(err);
      setProgress("Gagal memproses PDF: " + err.message);
    }
    setLoading(false);
  }, [scaleIdx, format]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f || f.type !== "application/pdf") return;
    const dt = new DataTransfer();
    dt.items.add(f);
    fileInputRef.current.files = dt.files;
    fileInputRef.current.dispatchEvent(new Event("change", { bubbles: true }));
  }, []);

  function download(dataUrl, pageNum) {
    const ext = format === "image/png" ? "png" : "jpg";
    const base = fileName.replace(/\.pdf$/i, "");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${base}_page${pageNum}.${ext}`;
    a.click();
  }

  function downloadAll() {
    pages.forEach((p) => download(p.dataUrl, p.pageNum));
  }

  return (
    <div style={{ padding: "32px 36px", maxWidth: 1000, margin: "0 auto" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 22, fontWeight: 700,
          background: "linear-gradient(135deg, #6366f1, #a78bfa)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          marginBottom: 6,
        }}>PDF to Image</h1>
        <p style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 13, color: "#52525b",
        }}>Konversi setiap halaman PDF menjadi gambar PNG atau JPG.</p>
      </div>

      {/* Settings row */}
      <div style={{ display: "flex", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <div style={{ ...labelStyle, marginBottom: 6 }}>Resolusi</div>
          <div style={{ display: "flex", gap: 6 }}>
            {SCALES.map((s, i) => (
              <button
                key={s.label}
                onClick={() => setScaleIdx(i)}
                style={{
                  ...btnBase, fontSize: 12, padding: "6px 12px",
                  background: scaleIdx === i ? "rgba(99,102,241,0.15)" : "rgba(24,24,27,0.6)",
                  color: scaleIdx === i ? "#a5b4fc" : "#a1a1aa",
                  border: scaleIdx === i ? "1px solid rgba(99,102,241,0.3)" : "1px solid #27272a",
                }}
              >{s.label}</button>
            ))}
          </div>
        </div>
        <div>
          <div style={{ ...labelStyle, marginBottom: 6 }}>Format</div>
          <div style={{ display: "flex", gap: 6 }}>
            {FORMATS.map((f) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                style={{
                  ...btnBase, fontSize: 12, padding: "6px 12px",
                  background: format === f ? "rgba(99,102,241,0.15)" : "rgba(24,24,27,0.6)",
                  color: format === f ? "#a5b4fc" : "#a1a1aa",
                  border: format === f ? "1px solid rgba(99,102,241,0.3)" : "1px solid #27272a",
                }}
              >{f === "image/png" ? "PNG" : "JPG"}</button>
            ))}
          </div>
        </div>
      </div>

      {/* Upload area */}
      <div
        onDrop={onDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !loading && fileInputRef.current?.click()}
        style={{
          border: "2px dashed #27272a",
          borderRadius: 16,
          padding: "48px 40px",
          textAlign: "center",
          cursor: loading ? "wait" : "pointer",
          background: "rgba(24,24,27,0.4)",
          marginBottom: 24,
          transition: "border-color 0.2s",
        }}
        onMouseEnter={(e) => e.currentTarget.style.borderColor = "#6366f1"}
        onMouseLeave={(e) => e.currentTarget.style.borderColor = "#27272a"}
      >
        <div style={{ fontSize: 42, marginBottom: 12 }}>📑</div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 15, fontWeight: 600, color: "#a1a1aa", marginBottom: 6,
        }}>{loading ? progress : "Upload file PDF"}</div>
        <div style={{
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          fontSize: 12, color: "#52525b",
        }}>{loading ? "Mohon tunggu..." : "Drag & drop atau klik untuk pilih file"}</div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={onFile}
          style={{ display: "none" }}
        />
      </div>

      {/* Results */}
      {pages.length > 0 && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={labelStyle}>{pages.length} halaman dikonversi</div>
            <button
              onClick={downloadAll}
              style={{
                ...btnBase, fontSize: 12,
                background: "rgba(34,197,94,0.12)", color: "#4ade80",
                border: "1px solid rgba(34,197,94,0.2)",
              }}
            >Download Semua</button>
          </div>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 16,
          }}>
            {pages.map((p) => (
              <div key={p.pageNum} style={{
                background: "rgba(24,24,27,0.5)",
                borderRadius: 12, border: "1px solid #27272a",
                overflow: "hidden",
              }}>
                <div style={{ padding: 12, display: "flex", justifyContent: "center", background: "#18181b" }}>
                  <img src={p.dataUrl} alt={`Page ${p.pageNum}`} style={{
                    maxWidth: "100%", maxHeight: 260, borderRadius: 4,
                  }} />
                </div>
                <div style={{ padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#a1a1aa", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>
                      Halaman {p.pageNum}
                    </div>
                    <div style={{ fontSize: 10, color: "#52525b", fontFamily: "'JetBrains Mono', monospace" }}>
                      {p.width}x{p.height}
                    </div>
                  </div>
                  <button
                    onClick={() => download(p.dataUrl, p.pageNum)}
                    style={{
                      ...btnBase, fontSize: 11, padding: "6px 10px",
                      background: "rgba(99,102,241,0.12)", color: "#a5b4fc",
                      border: "1px solid rgba(99,102,241,0.2)",
                    }}
                  >Download</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
