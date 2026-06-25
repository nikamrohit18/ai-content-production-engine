import { AbsoluteFill } from "remotion";

/**
 * Serif headline style per the niche visual style guide ("serif headline +
 * sans body"). Shows the full beat caption for the beat's whole duration —
 * word-by-word reveal would need per-word timestamps, which aren't derived
 * yet (only per-character alignment exists).
 */
export function Caption({ text }: { text: string }) {
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center" }}>
      <div
        style={{
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: 44,
          fontWeight: 600,
          color: "white",
          textAlign: "center",
          lineHeight: 1.3,
          textShadow: "0 2px 16px rgba(0,0,0,0.85), 0 0 4px rgba(0,0,0,0.6)",
          padding: "0 64px 96px",
        }}
      >
        {text}
      </div>
    </AbsoluteFill>
  );
}
