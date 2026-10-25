import { useState } from "react";

const command = "npx -p visorium -p @visorium/spatial visorium vr";

export interface SpatialInstallPromptProps {
  onClose: () => void;
}

export const SpatialInstallPrompt = ({ onClose }: SpatialInstallPromptProps) => {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    void navigator.clipboard
      ?.writeText(command)
      .then(() => setCopied(true))
      .catch(() => setCopied(false));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spatial-install-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1001,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: "rgba(0,0,0,0.72)",
        color: "#f5f5f5",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          width: "min(100%, 620px)",
          padding: 24,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.18)",
          background: "#1c1c1f",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}
      >
        <h2 id="spatial-install-title" style={{ marginTop: 0 }}>
          3D / VR support is not installed
        </h2>
        <p style={{ opacity: 0.8 }}>
          The optional spatial viewer adds the 3D gallery, model preview, and
          headset support. Run:
        </p>
        <pre
          style={{
            overflowX: "auto",
            padding: 12,
            borderRadius: 8,
            background: "#111",
            border: "1px solid rgba(255,255,255,0.16)",
            fontSize: 13,
          }}
        >
          {command}
        </pre>
        <p style={{ opacity: 0.68, fontSize: 13 }}>
          The first run will download the spatial assets. Normal image/video
          galleries do not require this add-on.
        </p>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button type="button" onClick={copy}>
            {copied ? "Copied" : "Copy command"}
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
