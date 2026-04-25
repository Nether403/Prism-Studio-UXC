"use client"

import dynamic from "next/dynamic"

const Scene = dynamic(() => import("@/components/scene").then((m) => m.Scene), {
  ssr: false,
  loading: () => null,
})

export function SceneMount() {
  return <Scene />
}
