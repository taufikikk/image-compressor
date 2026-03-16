import { useState } from "react";
import ImageCompressor from "./components/ImageCompressor.jsx";
import BackgroundRemover from "./components/BackgroundRemover.jsx";

const TOOLS = [
  { id: "compressor", label: "Compressor", icon: "🗜️", desc: "Compress & resize gambar" },
  { id: "bgremover", label: "BG Remover", icon: "✂️", desc: "Hapus background foto" },
];

export default function App() {
  const [active, setActive] = useState("compressor");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(145deg, #0a0a0f 0%, #12121f 40%, #0d1117 100%)",
      color: "#e4e4e7",
      fontFamily: "'Segoe UI', -apple-system, sans-serif",
      display: "flex",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
        @media (max-width: 768px) {
          .sidebar { position: fixed !important; z-index: 100 !important; height: 100vh !important; }
          .sidebar-hidden { transform: translateX(-100%) !important; }
          .main-content { margin-left: 0 !important; }
        }
      `}</style>

      {/* Sidebar */}
      <div
        className={`sidebar ${!sidebarOpen ? 'sidebar-hidden' : ''}`}
        style={{
          width: 220,
          minHeight: "100vh",
          background: "rgba(14,14,20,0.95)",
          borderRight: "1px solid #1e1e2a",
          padding: "20px 12px",
          display: "flex",
          flexDirection: "column",
          transition: "transform 0.25s ease",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "8px 10px", marginBottom: 28,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 17,
          }}>🛠️</div>
          <div>
            <div style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 15, fontWeight: 700,
              background: "linear-gradient(135deg, #a5b4fc, #c4b5fd)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Image Toolkit</div>
            <div style={{ fontSize: 9, color: "#52525b", letterSpacing: "0.05em" }}>
              100% client-side
            </div>
          </div>
        </div>

        {/* Nav label */}
        <div style={{
          fontSize: 10, fontWeight: 600, color: "#3f3f46",
          padding: "0 10px", marginBottom: 8,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          letterSpacing: "0.08em", textTransform: "uppercase",
        }}>Tools</div>

        {/* Tool list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              onClick={() => { setActive(tool.id); setSidebarOpen(true); }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "10px 12px",
                borderRadius: 10,
                border: "none",
                background: active === tool.id
                  ? "rgba(99,102,241,0.12)"
                  : "transparent",
                cursor: "pointer",
                transition: "all 0.15s",
                textAlign: "left",
              }}
            >
              <span style={{ fontSize: 18 }}>{tool.icon}</span>
              <div>
                <div style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  fontSize: 13, fontWeight: active === tool.id ? 600 : 500,
                  color: active === tool.id ? "#a5b4fc" : "#a1a1aa",
                }}>{tool.label}</div>
                <div style={{
                  fontSize: 10,
                  color: active === tool.id ? "#6366f1" : "#3f3f46",
                }}>{tool.desc}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: "auto", padding: "16px 10px" }}>
          <div style={{
            fontSize: 10, color: "#27272a",
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1.6,
          }}>
            Semua proses di browser.<br/>
            Data tidak dikirim ke server.
          </div>
        </div>
      </div>

      {/* Mobile toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        style={{
          position: "fixed", top: 12, left: sidebarOpen ? 232 : 12,
          zIndex: 101,
          width: 36, height: 36, borderRadius: 10,
          background: "rgba(24,24,27,0.9)",
          border: "1px solid #27272a",
          color: "#a1a1aa", fontSize: 16,
          cursor: "pointer",
          display: "none",
          alignItems: "center", justifyContent: "center",
          transition: "left 0.25s ease",
        }}
        className="mobile-toggle"
      >
        {sidebarOpen ? "✕" : "☰"}
      </button>
      <style>{`
        @media (max-width: 768px) {
          .mobile-toggle { display: flex !important; }
        }
      `}</style>

      {/* Main Content */}
      <div className="main-content" style={{
        flex: 1,
        overflow: "auto",
        minHeight: "100vh",
      }}>
        {active === "compressor" && <ImageCompressor />}
        {active === "bgremover" && <BackgroundRemover />}
      </div>
    </div>
  );
}
