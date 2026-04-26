"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { Float, MeshDistortMaterial, Points, PointMaterial } from "@react-three/drei"
import { Suspense, useEffect, useMemo, useRef } from "react"
import * as THREE from "three"

// Stars count was 2000 — at that density the cost is dominated by the rAF
// rotation update on a Points mesh of ~6k floats, which triggers GPU re-uploads
// every frame. 600 looks visually near-identical against the dark fog.
const STAR_COUNT = 600

/**
 * Global, scroll-driven scene. Listens to window scroll + mouse and drives
 * camera dolly, orb position/scale/distortion, color lerp, and star rotation.
 * Mount once at the page root.
 */

function Stars({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  const ref = useRef<THREE.Points>(null!)
  const positions = useMemo(() => {
    const arr = new Float32Array(STAR_COUNT * 3)
    for (let i = 0; i < STAR_COUNT; i++) {
      const r = 6 + Math.random() * 8
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      arr[i * 3 + 2] = r * Math.cos(phi)
    }
    return arr
  }, [])

  useFrame((_, delta) => {
    if (!ref.current) return
    const speedBoost = 1 + scrollRef.current * 4
    ref.current.rotation.y += delta * 0.04 * speedBoost
    ref.current.rotation.x += delta * 0.01 * speedBoost
  })

  return (
    <Points ref={ref} positions={positions} stride={3} frustumCulled>
      <PointMaterial
        transparent
        color="#fafafa"
        size={0.025}
        sizeAttenuation
        depthWrite={false}
        opacity={0.7}
      />
    </Points>
  )
}

const COLOR_A = new THREE.Color("#d4ff3a")
const COLOR_B = new THREE.Color("#ff5e1f")
const COLOR_C = new THREE.Color("#7be6ff")
const tmpColor = new THREE.Color()

function Orb({
  mouseRef,
  scrollRef,
}: {
  mouseRef: React.MutableRefObject<{ x: number; y: number }>
  scrollRef: React.MutableRefObject<number>
}) {
  const ref = useRef<THREE.Mesh>(null!)
  const matRef = useRef<any>(null!)

  useFrame((_, delta) => {
    if (!ref.current) return
    const s = scrollRef.current
    ref.current.rotation.x += delta * (0.15 + s * 0.6)
    ref.current.rotation.y += delta * (0.2 + s * 0.4)

    const targetX = mouseRef.current.x * 0.3 - s * 1.4
    const targetY = mouseRef.current.y * 0.3 - s * 0.8
    const targetZ = -s * 1.6
    ref.current.position.x += (targetX - ref.current.position.x) * 0.06
    ref.current.position.y += (targetY - ref.current.position.y) * 0.06
    ref.current.position.z += (targetZ - ref.current.position.z) * 0.06

    const targetScale = 1 + s * 0.4
    ref.current.scale.setScalar(
      ref.current.scale.x + (targetScale - ref.current.scale.x) * 0.06
    )

    if (matRef.current) {
      const t = Math.min(s, 1)
      if (t < 0.5) {
        tmpColor.copy(COLOR_A).lerp(COLOR_B, t * 2)
      } else {
        tmpColor.copy(COLOR_B).lerp(COLOR_C, (t - 0.5) * 2)
      }
      matRef.current.color.copy(tmpColor)
      matRef.current.emissive.copy(tmpColor)
      matRef.current.distort = 0.42 + Math.min(s, 1) * 0.35
    }
  })

  return (
    <Float speed={1.4} rotationIntensity={0.4} floatIntensity={1.2}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1.6, 24]} />
        <MeshDistortMaterial
          ref={matRef}
          color="#d4ff3a"
          emissive="#d4ff3a"
          // Without the HDRI environment we lean on emissive + lower metalness
          // so the orb still reads as luminous against the fog.
          emissiveIntensity={0.35}
          roughness={0.55}
          metalness={0.3}
          distort={0.42}
          speed={1.6}
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </mesh>
    </Float>
  )
}

function Ring({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((_, delta) => {
    if (!ref.current) return
    const s = scrollRef.current
    ref.current.rotation.x += delta * (0.05 + s * 0.2)
    ref.current.rotation.z += delta * (0.08 + s * 0.2)
    ref.current.scale.setScalar(1 + s * 0.6)
  })
  return (
    <mesh ref={ref} position={[0, 0, -0.5]}>
      <torusGeometry args={[3, 0.012, 16, 200]} />
      <meshBasicMaterial color="#ff5e1f" transparent opacity={0.3} depthWrite={false} />
    </mesh>
  )
}

function CameraDolly({ scrollRef }: { scrollRef: React.MutableRefObject<number> }) {
  const { camera } = useThree()
  useFrame(() => {
    const s = scrollRef.current
    const targetZ = 5 + s * 2
    camera.position.z += (targetZ - camera.position.z) * 0.05
    camera.position.x += (s * 0.4 - camera.position.x) * 0.05
    camera.lookAt(0, 0, 0)
  })
  return null
}

export function Scene() {
  const mouseRef = useRef({ x: 0, y: 0 })
  const scrollRef = useRef(0)

  useEffect(() => {
    const onMouse = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = -((e.clientY / window.innerHeight) * 2 - 1)
    }
    const onScroll = () => {
      // Normalize against ~3 viewport heights so the scene fully transforms by mid-page
      const denom = window.innerHeight * 3
      scrollRef.current = Math.min(1.2, window.scrollY / denom)
    }
    window.addEventListener("mousemove", onMouse, { passive: true })
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => {
      window.removeEventListener("mousemove", onMouse)
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      >
        <color attach="background" args={["#0a0a0a"]} />
        <fog attach="fog" args={["#0a0a0a", 5, 14]} />
        <ambientLight intensity={0.3} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} color="#ffffff" />
        <pointLight position={[-3, 2, -2]} intensity={2} color="#ff5e1f" />
        <pointLight position={[3, -2, 2]} intensity={1.5} color="#d4ff3a" />

        {/*
          Removed <Environment preset="city" />: the HDRI was a ~1MB async fetch
          plus a heavy CubeUVReflectionMapping pass on every frame that the orb's
          MeshDistortMaterial referenced. The existing directional + point lights
          give the orb plenty of definition against the fog.
        */}
        <Suspense fallback={null}>
          <Orb mouseRef={mouseRef} scrollRef={scrollRef} />
          <Ring scrollRef={scrollRef} />
          <Stars scrollRef={scrollRef} />
        </Suspense>
        <CameraDolly scrollRef={scrollRef} />
      </Canvas>
    </div>
  )
}
