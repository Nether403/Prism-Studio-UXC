import { ImageResponse } from "next/og"
import { createClient } from "@/lib/supabase/server"
import { LIBRARIES } from "@/lib/stack-data"
import type { Theme } from "@/lib/themes"

export const runtime = "nodejs"
export const revalidate = 600

type StackRow = {
  id: string
  headline: string
  title: string | null
  vibe: string
  audience: string
  stack_ids: string[]
  theme: Theme | null
  impact_score: number
  perf_budget: number
}

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const { data } = await supabase
    .from("stacks")
    .select("id,headline,title,vibe,audience,stack_ids,theme,impact_score,perf_budget")
    .eq("id", id)
    .maybeSingle()

  const row = data as StackRow | null
  const title = row?.title || row?.headline || "Prism Studio"
  const theme = row?.theme
  const libNames = (row?.stack_ids ?? [])
    .map((sid) => LIBRARIES.find((l) => l.id === sid)?.name)
    .filter(Boolean)
    .slice(0, 6) as string[]

  const bg = theme?.background ?? "#0a0a0a"
  const fg = theme?.foreground ?? "#fafafa"
  const accent = theme?.accent ?? "#fb7185"
  const primary = theme?.primary ?? "#f97316"
  const card = theme?.card ?? "#171717"
  const border = theme?.border ?? "#27272a"

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
        {/* gradient stripe */}
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

        {/* header row */}
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
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: primary,
                display: "flex",
              }}
            />
            <span>Prism Studio</span>
          </div>
          <div style={{ display: "flex" }}>/{row?.id ?? "—"}</div>
        </div>

        {/* headline */}
        <div
          style={{
            display: "flex",
            marginTop: "auto",
            fontSize: 92,
            lineHeight: 0.95,
            letterSpacing: -3,
            fontWeight: 600,
            maxWidth: "90%",
          }}
        >
          {title}
        </div>

        {/* meta */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            marginTop: 36,
            fontSize: 22,
            color: fg,
            opacity: 0.85,
          }}
        >
          {row?.vibe && (
            <span
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: `1px solid ${border}`,
                background: card,
                textTransform: "uppercase",
                letterSpacing: 2,
                fontSize: 16,
              }}
            >
              {row.vibe}
            </span>
          )}
          {row?.audience && (
            <span
              style={{
                padding: "8px 16px",
                borderRadius: 999,
                border: `1px solid ${border}`,
                background: card,
                textTransform: "uppercase",
                letterSpacing: 2,
                fontSize: 16,
              }}
            >
              {row.audience}
            </span>
          )}
          <span
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: `1px solid ${border}`,
              background: card,
              fontSize: 16,
              letterSpacing: 1,
            }}
          >
            {libNames.length} libs
          </span>
        </div>

        {/* stack chips */}
        {libNames.length > 0 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              marginTop: 22,
            }}
          >
            {libNames.map((n) => (
              <div
                key={n}
                style={{
                  display: "flex",
                  padding: "10px 18px",
                  borderRadius: 12,
                  background: card,
                  border: `1px solid ${border}`,
                  fontSize: 22,
                  color: fg,
                }}
              >
                {n}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
