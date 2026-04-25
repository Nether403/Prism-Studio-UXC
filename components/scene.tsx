"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { Environment, Float, MeshDistortMaterial, Points, PointMaterial } from "@react-three/drei"
import { Suspense, useMemo, useRef } from "react"
import * as THREE from "three"

function Stars() {
  const ref = useRef<THREE.Points>(null!)
  const positions = useMemo(() => {
    const arr = new Float32Array(1500 * 3)
    for (let i = 0; i < 1500; i++) {
      const r = 6 + Math.random() * 6
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      arr[i * 3 + 2] = r * Math.cos(phi)
    }
    return arr
  }, [])

  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.rotation.y += delta * 0.04
      ref.current.rotation.x += delta * 0.01
    }
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

function Orb({ mouse }: { mouse: React.MutableRefObject<{ x: number; y: number }> }) {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((state, delta) => {
    if (!ref.current) return
    ref.current.rotation.x += delta * 0.15
    ref.current.rotation.y += delta * 0.2
    // Subtle parallax to mouse
    const targetX = mouse.current.x * 0.3
    const targetY = mouse.current.y * 0.3
    ref.current.position.x += (targetX - ref.current.position.x) * 0.05
    ref.current.position.y += (targetY - ref.current.position.y) * 0.05
  })

  return (
    <Float speed={1.4} rotationIntensity={0.4} floatIntensity={1.2}>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1.6, 24]} />
        <MeshDistortMaterial
          color="#d4ff3a"
          emissive="#d4ff3a"
          emissiveIntensity={0.15}
          roughness={0.15}
          metalness={0.85}
          distort={0.42}
          speed={1.6}
        />
      </mesh>
    </Float>
  )
}

function Ring() {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((_, delta) => {
    if (!ref.current) return
    ref.current.rotation.x += delta * 0.05
    ref.current.rotation.z += delta * 0.08
  })
  return (
    <mesh ref={ref} position={[0, 0, -0.5]}>
      <torusGeometry args={[3, 0.012, 16, 200]} />
      <meshBasicMaterial color="#ff5e1f" transparent opacity={0.5} />
    </mesh>
  )
}

export function Scene() {
  const mouse = useRef({ x: 0, y: 0 })

  return (
    <div
      className="absolute inset-0"
      onMouseMove={(e) => {
        const x = (e.clientX / window.innerWidth) * 2 - 1
        const y = -((e.clientY / window.innerHeight) * 2 - 1)
        mouse.current = { x, y }
      }}
    >
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

        <Suspense fallback={null}>
          <Orb mouse={mouse} />
          <Ring />
          <Stars />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  )
}
