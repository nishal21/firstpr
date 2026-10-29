import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "FirstPR. Your first PR, written by you.";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#FAFBFC",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "#0473FD",
            }}
          />
          <div style={{ fontSize: 28, color: "#0F1828", fontWeight: 700 }}>FirstPR</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 72,
              lineHeight: 1.02,
              fontWeight: 800,
              color: "#0F1828",
              letterSpacing: -2,
              maxWidth: 980,
            }}
          >
            Your first PR, written by you.
          </div>
          <div style={{ fontSize: 28, color: "#5B6472", maxWidth: 860 }}>
            Find a beginner issue. See the files. Score the PR before a maintainer does.
          </div>
        </div>
        <div style={{ fontSize: 22, color: "#0473FD", fontWeight: 600 }}>
          Never writes the fix
        </div>
      </div>
    ),
    { ...size },
  );
}
