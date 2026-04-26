"use client"

import { Card } from "@/components/ui/card"
import type { Signature } from "@/lib/signature"
import { cn } from "@/lib/utils"

export function SignatureCard({ signature }: { signature: Signature }) {
  return (
    <Card className="flex flex-col gap-5 p-5">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Signature
        </p>
        <h3 className="mt-1 font-display text-xl tracking-[-0.01em] text-pretty leading-snug">
          {signature.vibeStatement}
        </h3>
        <p className="mt-2 text-xs text-muted-foreground leading-relaxed text-pretty">
          {signature.contentSignature}
        </p>
      </div>

      {/* Vibe / audience / layout / motion */}
      <div className="grid grid-cols-2 gap-3">
        <Tag label="Vibe" value={signature.vibe} />
        <Tag label="Audience" value={signature.audience} />
        <Tag label="Layout" value={signature.layoutPattern.replace(/-/g, " ")} />
        <Tag
          label="Motion"
          value={["static", "subtle", "expressive", "experimental"][signature.motionLevel] ?? "—"}
        />
      </div>

      {/* Palette */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Palette
        </p>
        <div className="mt-2 grid grid-cols-5 gap-1.5">
          {signature.palette.map((swatch) => (
            <div key={swatch.role} className="flex flex-col gap-1">
              <div
                className="aspect-square rounded-md border border-border"
                style={{ background: swatch.hex }}
                aria-label={`${swatch.role}: ${swatch.hex}`}
              />
              <div className="flex flex-col leading-tight">
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                  {swatch.role}
                </span>
                <span className="text-[10px] text-foreground">{swatch.name}</span>
                <span className="font-mono text-[9px] text-muted-foreground">
                  {swatch.hex.toLowerCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Fonts */}
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Fonts
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <FontSwatch label="Display" font={signature.fonts.display} category={signature.fonts.category} />
          <FontSwatch label="Body" font={signature.fonts.body} />
        </div>
      </div>

      {/* Library hints */}
      {signature.libraryHints.length > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Library hints
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {signature.libraryHints.map((hint) => (
              <span
                key={hint}
                className="rounded-full border border-border bg-background/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {hint}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Motion cues */}
      {signature.motionCues.length > 0 && (
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Motion cues
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {signature.motionCues.map((cue) => (
              <span
                key={cue}
                className="rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] text-foreground"
              >
                {cue}
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

function Tag({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-2.5">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn("mt-0.5 text-sm font-medium capitalize", tone ?? "text-foreground")}>
        {value}
      </div>
    </div>
  )
}

function FontSwatch({
  label,
  font,
  category,
}: {
  label: string
  font: string
  category?: string
}) {
  return (
    <div className="rounded-md border border-border bg-background/40 p-2.5">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        {category && (
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            {category}
          </span>
        )}
      </div>
      <div className="mt-0.5 truncate text-sm text-foreground">{font}</div>
    </div>
  )
}
