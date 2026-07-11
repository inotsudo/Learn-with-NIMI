"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MiniGloryStickerButton, drawNimiGlory } from "@/components/parent/sticker-download"
import type { ChildProfile } from "./child-types"
import { useLanguage } from "@/contexts/LanguageContext"

export function StickerPreviewCard({
  child,
  badge,
  language,
}: {
  child: ChildProfile
  badge: string
  language: "en" | "sw" | "fr" | "es" | "rw"
}) {
  const { t } = useLanguage()
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [url, setUrl] = useState<string>("")

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawNimiGlory(canvas, child, badge) // Imperative draw with a ref [^2]
    setUrl(canvas.toDataURL("image/png"))
  }, [child, badge])

  return (
    <Card className="bg-white border-2 border-violet-200">
      <CardHeader>
        <CardTitle className="text-violet-700">{t("stickerPreviewTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {url ? (
          <img
            src={url || "/placeholder.svg?height=400&width=400&query=sticker%20preview"}
            alt={`${child.name} ${t("stickerPreviewAlt")}`}
            className="w-full rounded-md border"
           loading="lazy" />
        ) : null}
        <MiniGloryStickerButton child={child} badge={badge} language={language} />
        <canvas ref={canvasRef} className="hidden" width={720} height={720} />
      </CardContent>
    </Card>
  )
}
