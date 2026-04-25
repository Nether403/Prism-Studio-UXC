"use client"

import { useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import * as THREE from "three"

function Cube() {
  const ref = useRef<THREE.Mesh>(null!)
  useFrame((state) => {
    if (!ref.current) return
    const t = state.clock.elapsedTime
    ref.current.position.y = Math.sin(t * 2) * 0.3
    ref.current.rotation.x = t * 0.4
    ref.current.rotation.z = t * 0.3
  })
  return (
    <mesh ref={ref}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="white" metalness={0.4} roughness={0.3} />
    </mesh>
  )
}

export function R3FCubeDemo() {
  return (
    <Canvas dpr={[1, 1.5]} camera={{ position: [2, 2, 2.5], fov: 45 }} gl={{ alpha: true }}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 5, 3]} intensity={1} />
      <Cube />
    </Canvas>
  )
}
