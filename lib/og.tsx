import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { SITE_URL } from "@/lib/site";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const BLUE = "#0473FD";
const INK = "#16140f";
const PAPER = "#fffdf8";
const MERGED = "#8250df";

type Assets = {
  spray: Buffer;
  inter: Buffer;
  plex: Buffer;
  cat: string;
  crowd: string;
};

let assets: Promise<Assets> | null = null;

function loadAssets(): Promise<Assets> {
  if (!assets) {
    const dir = join(process.cwd(), "assets", "og");
    assets = Promise.all([
      readFile(join(dir, "RubikSprayPaint-Latin.woff")),
      readFile(join(dir, "Inter-Bold-Latin.ttf")),
      readFile(join(dir, "IBMPlexMono-Medium-Latin.ttf")),
      readFile(join(dir, "cat.png")),
      readFile(join(dir, "crowd.png")),
    ]).then(([spray, inter, plex, cat, crowd]) => ({
      spray,
      inter,
      plex,
      cat: `data:image/png;base64,${cat.toString("base64")}`,
      crowd: `data:image/png;base64,${crowd.toString("base64")}`,
    }));
    assets.catch(() => {
      assets = null;
    });
  }
  return assets;
}

export type OgCard = {
  /** Small sticker above the headline, e.g. "Explain" or "owner/repo #12". */
  kicker: string;
  /** Big spray line. Keep it short; long text is cut. */
  display: string;
  /** Plain sentence under the display line. */
  line: string;
  /** Up to four label chips. */
  chips?: string[];
  /** Rubber stamp text in the corner. */
  stamp: string;
  /** Spray for short brand lines; plain bold for user text such as issue titles. */
  displayFont?: "spray" | "plain";
};

/** Cut at a word boundary so the card never overflows. */
export function clip(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

function host(): string {
  return SITE_URL.replace(/^https?:\/\//, "");
}

export async function renderOgCard(card: OgCard): Promise<ImageResponse> {
  const a = await loadAssets();
  const plain = card.displayFont === "plain";
  const display = clip(card.display, plain ? 110 : 64);
  const displaySize = plain
    ? display.length > 70 ? 44 : display.length > 40 ? 52 : 62
    : display.length > 34 ? 54 : display.length > 18 ? 66 : 84;
  const chips = (card.chips ?? []).slice(0, 4).map((chip) => clip(chip, 24));

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: BLUE,
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.16) 2px, transparent 2px)",
          backgroundSize: "28px 28px",
          fontFamily: "Inter",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 48,
            top: 34,
            width: 900,
            height: 444,
            display: "flex",
            flexDirection: "column",
            backgroundColor: PAPER,
            border: `6px solid ${INK}`,
            boxShadow: `12px 12px 0 ${INK}`,
            transform: "rotate(-1.5deg)",
            padding: "26px 40px 24px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                width: 84,
                height: 84,
                padding: 4,
                backgroundColor: PAPER,
                border: `4px solid ${INK}`,
                boxShadow: `5px 5px 0 ${INK}`,
                transform: "rotate(-8deg)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain img */}
              <img src={a.cat} width={68} height={68} alt="" />
            </div>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 26 }}>
              <div style={{ fontFamily: "Spray", fontSize: 64, lineHeight: 1, color: INK }}>FirstPR</div>
              <div
                style={{
                  display: "flex",
                  marginTop: 6,
                  fontFamily: "Plex",
                  fontSize: 22,
                  color: BLUE,
                  letterSpacing: 1,
                }}
              >
                {clip(card.kicker, 46)}
              </div>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexShrink: 0,
              marginTop: 20,
              fontFamily: plain ? "Inter" : "Spray",
              fontSize: displaySize,
              lineHeight: plain ? 1.12 : 1.02,
              letterSpacing: plain ? -1 : 0,
              color: INK,
              maxHeight: displaySize * (plain ? 2.3 : 2.1),
              overflow: "hidden",
            }}
          >
            {display}
          </div>
          <div style={{ display: "flex", flexShrink: 0, marginTop: 12, fontSize: 26, lineHeight: 1.25, color: "#3f3a32" }}>
            {clip(card.line, 110)}
          </div>
          <div style={{ display: "flex", flexGrow: 1 }} />
          <div style={{ display: "flex", flexShrink: 0, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 10 }}>
              {chips.map((chip) => (
                <div
                  key={chip}
                  style={{
                    display: "flex",
                    padding: "5px 12px",
                    border: `3px solid ${INK}`,
                    backgroundColor: "#eaf3ff",
                    fontFamily: "Plex",
                    fontSize: 18,
                    color: INK,
                  }}
                >
                  {chip}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", flexShrink: 0, whiteSpace: "nowrap", fontFamily: "Plex", fontSize: 20, color: "#3f3a32" }}>{host()}</div>
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            right: 30,
            top: 26,
            display: "flex",
            padding: "10px 22px",
            border: `7px solid ${MERGED}`,
            borderRadius: 14,
            backgroundColor: "rgba(255,253,248,0.94)",
            color: MERGED,
            fontFamily: "Inter",
            fontSize: 40,
            letterSpacing: 4,
            transform: "rotate(11deg)",
            boxShadow: `6px 6px 0 ${INK}`,
          }}
        >
          {clip(card.stamp, 12).toUpperCase()}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain img */}
        <img
          src={a.crowd}
          width={1200}
          height={175}
          alt=""
          style={{ position: "absolute", left: 0, bottom: -52 }}
        />
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [
        { name: "Spray", data: a.spray, weight: 400, style: "normal" },
        { name: "Inter", data: a.inter, weight: 700, style: "normal" },
        { name: "Plex", data: a.plex, weight: 500, style: "normal" },
      ],
      headers: { "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800" },
    },
  );
}
