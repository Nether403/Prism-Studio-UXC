import { ImageResponse } from "next/og"
import { LIBRARIES, type Category } from "@/lib/stack-data"

export const runtime = "nodejs"
export const revalidate = 3600

const CATEGORY_HUE: Record<Category, string> = {
  framework: "#f97316",
  "3d": "#a855f7",
  motion: "#ec4899",
  ui: "#22d3ee",
  styling: "#84cc16",
  scroll: "#0ea5e9",
  ai: "#fb7185",
  components: "#f59e0b",
  assets: "#10b981",
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const lib = LIBRARIES.find((l) => l.id === id)

  const bg = "#0a0a0a"
  const fg = "#fafafa"
  const card = "#141414"
  const border = "#27272a"
  const accent = lib ? CATEGORY_HUE[lib.category] : "#f97316"
  const primary = "#f97316"

  const title = lib?.name ?? "Library"
  const tagline = lib?.tagline ?? "Curated for the Prism stack."
  const tags = (lib?.tags ?? []).slice(0, 5)

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: bg,
          color: fg,
          padding: "72px 80px",
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
            height: 8,
            background: `linear-gradient(90deg, ${primary}, ${accent})`,
          }}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 18,
            letterSpacing: 4,
            textTransform: "uppercase",
            opacity: 0.7,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: primary, display: "flex" }} />
            <span>Prism · Library</span>
          </div>
          <div
            style={{
              display: "flex",
              padding: "6px 14px",
              borderRadius: 999,
              background: accent,
              color: bg,
              letterSpacing: 3,
              fontSize: 14,
            }}
          >
            {lib?.category ?? "lib"}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: "auto",
            fontSize: 120,
            lineHeight: 0.95,
            letterSpacing: -4,
            fontWeight: 600,
          }}
        >
          {title}
        </div>
        <div style={{ display: "flex", marginTop: 20, fontSize: 30, opacity: 0.8, maxWidth: "82%" }}>
          {tagline}
        </div>

        {tags.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 28 }}>
            {tags.map((t) => (
              <div
                key={t}
                style={{
                  display: "flex",
                  padding: "10px 18px",
                  borderRadius: 12,
                  background: card,
                  border: `1px solid ${border}`,
                  fontSize: 22,
                  color: fg,
                  textTransform: "lowercase",
                  letterSpacing: 1,
                }}
              >
                {t}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
