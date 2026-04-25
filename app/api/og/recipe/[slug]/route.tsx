import { ImageResponse } from "next/og"
import { RECIPES } from "@/lib/recipes"

export const runtime = "edge"
export const contentType = "image/png"
export const size = { width: 1200, height: 630 }

const palettes: Record<string, { bg: string; fg: string; primary: string; accent: string }> = {
  brutalist: { bg: "#0a0a0a", fg: "#fafafa", primary: "#fafafa", accent: "#ff4500" },
  editorial: { bg: "#f5f1eb", fg: "#1a1a1a", primary: "#1a1a1a", accent: "#a64d2e" },
  cinematic: { bg: "#0d1117", fg: "#e6edf3", primary: "#e6edf3", accent: "#58a6ff" },
  minimal: { bg: "#fafafa", fg: "#0a0a0a", primary: "#0a0a0a", accent: "#666666" },
  glass: { bg: "#0a0e1a", fg: "#e6edf3", primary: "#e6edf3", accent: "#7dd3fc" },
  pastel: { bg: "#fef6e4", fg: "#001858", primary: "#001858", accent: "#f582ae" },
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params
  const recipe = RECIPES.find((r) => r.slug === slug)
  if (!recipe) {
    return new Response("Not found", { status: 404 })
  }

  const palette = palettes[recipe.vibe] ?? palettes.minimal
  const { bg, fg, primary, accent } = palette

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: bg,
        color: fg,
        padding: "72px",
        fontFamily: "Inter, system-ui, sans-serif",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "8px",
          backgroundColor: accent,
          display: "flex",
        }}
      />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "48px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            fontSize: "24px",
            fontWeight: 600,
            letterSpacing: "-0.02em",
          }}
        >
          <div
            style={{
              width: "32px",
              height: "32px",
              backgroundColor: primary,
              borderRadius: "6px",
              display: "flex",
            }}
          />
          Prism
        </div>

        <div
          style={{
            display: "flex",
            fontFamily: "monospace",
            fontSize: "14px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: accent,
          }}
        >
          Recipe · {recipe.vibe}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          flex: 1,
          justifyContent: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: "84px",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.04,
            maxWidth: "950px",
          }}
        >
          {recipe.title}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: "30px",
            opacity: 0.78,
            lineHeight: 1.35,
            maxWidth: "900px",
          }}
        >
          {recipe.tagline}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontFamily: "monospace",
          fontSize: "16px",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: 0.7,
          marginTop: "32px",
        }}
      >
        <div style={{ display: "flex", gap: "24px" }}>
          <span>{recipe.audience}</span>
          <span style={{ opacity: 0.4 }}>·</span>
          <span>{recipe.performance} budget</span>
        </div>
        <div style={{ display: "flex" }}>prism.app</div>
      </div>
    </div>,
    { ...size },
  )
}
