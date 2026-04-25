"use client"

import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

function Orb() {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((_, dt) => {
    if (!ref.current) return
    ref.current.rotation.x += dt * 0.4
    ref.current.rotation.y += dt * 0.6
  })
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[0.95, 1]} />
      <meshStandardMaterial
        color="white"
        wireframe
        emissive="white"
        emissiveIntensity={0.4}
      />
    </mesh>
  )
}

export function R3FOrbDemo() {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 0, 2.5], fov: 50 }} gl={{ alpha: true }}>
      <ambientLight intensity={0.3} />
      <directionalLight position={[2, 3, 2]} intensity={0.8} />
      <Orb />
    </Canvas>
  )
}
