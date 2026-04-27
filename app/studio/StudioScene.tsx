'use client'

import { useMemo, useEffect, useRef, useLayoutEffect, useCallback, useState } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid, TransformControls } from '@react-three/drei'
import * as THREE from 'three'
import { useStudioStore } from './page.stores'
import { SegmentData, ModelConfigRow, BodyGroup } from './page.types'
import { NodeOverlay } from './NodeOverlay'
import { AnimatedModel } from '../game/AnimatedModel'
import { TargetController } from '../game/TargetController'
import { modelConfigToCreatureConfig } from '../game/modelConfigToCreatureConfig'

function groupCentroidXZ(group: BodyGroup, segmentMap: Map<string, SegmentData>): { x: number; z: number } {
  let sumX = 0, sumZ = 0, count = 0
  for (const sid of group.segmentIds) {
    const seg = segmentMap.get(sid)
    if (!seg) continue
    for (let i = 0; i < seg.positions.length; i += 3) {
      sumX += seg.positions[i]
      sumZ += seg.positions[i + 2]
      count++
    }
  }
  return count > 0 ? { x: sumX / count, z: sumZ / count } : { x: 0, z: 0 }
}

function buildChainJoints(groups: BodyGroup[], segments: SegmentData[]): { x: number; z: number }[] {
  const head = groups.find((g) => g.type === 'head')
  const tail = groups.find((g) => g.type === 'tail')
  const spines = groups.filter((g) => g.type === 'spine')
  const chain: BodyGroup[] = [...(head ? [head] : []), ...spines, ...(tail ? [tail] : [])]
  if (chain.length === 0) return []
  const segmentMap = new Map(segments.map((s) => [s.id, s]))
  const joints: { x: number; z: number }[] = []
  const front0 = chain[0].nodeFront ?? groupCentroidXZ(chain[0], segmentMap)
  joints.push({ x: front0.x, z: front0.z })
  for (const g of chain) {
    const back = g.nodeBack ?? groupCentroidXZ(g, segmentMap)
    joints.push({ x: back.x, z: back.z })
  }
  return joints
}

const CAMERA_PRESETS = {
  reset: { pos: [0, 8, 16]    as [number, number, number], target: [0, 3, 0] as [number, number, number] },
  front: { pos: [0, 4, 22]    as [number, number, number], target: [0, 4, 0] as [number, number, number] },
  top:   { pos: [0, 30, 0.01] as [number, number, number], target: [0, 0, 0] as [number, number, number] },
  side:  { pos: [22, 4, 0]    as [number, number, number], target: [0, 4, 0] as [number, number, number] },
}

function CameraController() {
  const { cameraPreset, setCameraPreset } = useStudioStore()
  const { camera, controls } = useThree()

  useEffect(() => {
    if (!cameraPreset || !controls) return
    const oc = controls as unknown as { target: THREE.Vector3; update: () => void }
    const p = CAMERA_PRESETS[cameraPreset]
    camera.position.set(...p.pos)
    oc.target.set(...p.target)
    oc.update()
    setCameraPreset(null)
  }, [cameraPreset, camera, controls, setCameraPreset])

  return null
}

function SphereSelector() {
  const { sphere, setSphere } = useStudioStore()
  const groupRef = useRef<THREE.Group>(null!)
  const isDragging = useRef(false)
  const lastIdsKey = useRef('')
  const { controls } = useThree()

  useLayoutEffect(() => {
    if (!groupRef.current || isDragging.current || !sphere) return
    groupRef.current.position.set(sphere.x, sphere.y, sphere.z)
  }, [sphere?.x, sphere?.y, sphere?.z])

  useFrame(() => {
    if (!groupRef.current) return
    const s = useStudioStore.getState().sphere
    if (!s) return
    const { segments: segs, modelRotation: mr } = useStudioStore.getState()
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(...mr)).invert()
    const { x, y, z } = groupRef.current.position
    const localCenter = new THREE.Vector3(x, y, z).applyQuaternion(q)
    const r2 = s.radius * s.radius
    const matchingIds: string[] = []
    for (const seg of segs) {
      let hit = false
      for (let i = 0; i < seg.positions.length; i += 3) {
        const dx = seg.positions[i] - localCenter.x
        const dy = seg.positions[i + 1] - localCenter.y
        const dz = seg.positions[i + 2] - localCenter.z
        if (dx * dx + dy * dy + dz * dz <= r2) { hit = true; break }
      }
      if (hit) matchingIds.push(seg.id)
    }
    const newKey = matchingIds.join(',')
    if (newKey !== lastIdsKey.current) {
      lastIdsKey.current = newKey
      useStudioStore.getState().setPendingSegmentIds(matchingIds)
    }
  })

  const handleMouseDown = useCallback(() => {
    isDragging.current = true
    if (controls) (controls as unknown as { enabled: boolean }).enabled = false
  }, [controls])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
    if (controls) (controls as unknown as { enabled: boolean }).enabled = true
    if (!groupRef.current) return
    const { x, y, z } = groupRef.current.position
    const s = useStudioStore.getState().sphere
    if (!s) return
    setSphere({ x, y, z, radius: s.radius })
  }, [controls, setSphere])

  if (!sphere) return null

  return (
    <>
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[sphere.radius, 32, 16]} />
          <meshStandardMaterial color="#7c3aed" transparent opacity={0.2} depthWrite={false} />
        </mesh>
      </group>
      <TransformControls
        object={groupRef}
        mode="translate"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      />
    </>
  )
}

function SegmentMesh({
  seg,
  isPending,
  groupColor,
  dimmed,
  onClick,
}: {
  seg: SegmentData
  isPending: boolean
  groupColor: string | null
  dimmed: boolean
  onClick: () => void
}) {
  const { selectionMode, sphere, setSphere } = useStudioStore()

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(seg.positions, 3))
    g.computeVertexNormals()
    return g
  }, [seg.positions])

  const handleClick = useCallback((e: { stopPropagation: () => void; point: THREE.Vector3 }) => {
    e.stopPropagation()
    if (selectionMode === 'sphere') {
      setSphere({ x: e.point.x, y: e.point.y, z: e.point.z, radius: sphere?.radius ?? 2.0 })
    } else if (selectionMode === 'click') {
      onClick()
    }
  }, [selectionMode, sphere, setSphere, onClick])

  if (isPending) {
    return (
      <mesh geometry={geom} onClick={handleClick}>
        <meshStandardMaterial
          color={seg.color}
          emissive={seg.color}
          emissiveIntensity={0.7}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
    )
  }

  if (groupColor) {
    return (
      <mesh geometry={geom} onClick={handleClick}>
        <meshStandardMaterial color={groupColor} roughness={0.4} metalness={0.05} />
      </mesh>
    )
  }

  return (
    <mesh geometry={geom} onClick={handleClick}>
      <meshStandardMaterial
        color={seg.color}
        opacity={dimmed ? 0.35 : 1}
        transparent={dimmed}
        roughness={0.5}
        metalness={0.05}
      />
    </mesh>
  )
}

const BATCH_SIZE = 10

function AnimateContent() {
  const { segments, groups, stlKey, configId, configName, modelRotation, animationConfig, showAttractor } = useStudioStore()

  const initialJoints = useMemo(() => buildChainJoints(groups, segments), [groups, segments])
  const headXZ = initialJoints[0] ?? null

  const targetRef = useRef(new THREE.Vector3(headXZ?.x ?? 0, 0, headXZ?.z ?? 0))
  const userTargetGoalRef = useRef(new THREE.Vector3(headXZ?.x ?? 0, 0, headXZ?.z ?? 0))

  useEffect(() => {
    if (!headXZ) return
    targetRef.current.set(headXZ.x, 0, headXZ.z)
    userTargetGoalRef.current.set(headXZ.x, 0, headXZ.z)
  }, [headXZ?.x, headXZ?.z])

  const modelConfig = useMemo<ModelConfigRow>(
    () => ({
      id: configId ?? 'studio-preview',
      stl_key: stlKey ?? '',
      name: configName || 'preview',
      groups,
      model_rotation: modelRotation,
      created_at: new Date().toISOString(),
    }),
    [configId, stlKey, configName, groups, modelRotation]
  )

  const creatureConfig = useMemo(() => {
    const base = modelConfigToCreatureConfig(modelConfig, segments)
    return {
      ...base,
      ...animationConfig,
      chainOrigin: headXZ ?? undefined,
      initialJoints: initialJoints.length > 0 ? initialJoints : undefined,
    }
  }, [modelConfig, segments, animationConfig, headXZ?.x, headXZ?.z, initialJoints])

  if (groups.length === 0 || segments.length === 0) return null

  return (
    <>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onPointerDown={(e) => {
          e.stopPropagation()
          userTargetGoalRef.current.set(e.point.x, 0, e.point.z)
        }}
      >
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
      </mesh>
      <TargetController
        targetRef={targetRef}
        userTargetGoalRef={userTargetGoalRef}
        config={creatureConfig}
        showAttractor={showAttractor}
      />
      <AnimatedModel
        creatureConfig={creatureConfig}
        modelConfig={modelConfig}
        segments={segments}
        targetRef={targetRef}
      />
    </>
  )
}

function SceneContent() {
  const {
    segments, pendingSegmentIds, groups, togglePendingSegment, modelRotation,
    selectionMode, sphere, setSphere,
  } = useStudioStore()

  const [renderCount, setRenderCount] = useState(0)

  useEffect(() => {
    if (segments.length === 0) { setRenderCount(0); return }
    let count = 0
    let raf: number
    function addBatch() {
      count = Math.min(count + BATCH_SIZE, segments.length)
      setRenderCount(count)
      if (count < segments.length) raf = requestAnimationFrame(addBatch)
    }
    raf = requestAnimationFrame(addBatch)
    return () => cancelAnimationFrame(raf)
  }, [segments])

  const visibleSegments = segments.slice(0, renderCount)

  const assignedMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const g of groups) {
      for (const sid of g.segmentIds) {
        map.set(sid, g.color)
      }
    }
    return map
  }, [groups])

  const anyPending = pendingSegmentIds.length > 0

  return (
    <>
      <Grid
        position={[0, 0.001, 0]}
        args={[100, 100]}
        cellSize={1}
        cellColor="#888888"
        sectionSize={5}
        sectionColor="#aaaaaa"
        fadeDistance={60}
        fadeStrength={1}
        infiniteGrid
      />
      {selectionMode === 'sphere' && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0, 0]}
          onClick={(e) => {
            e.stopPropagation()
            setSphere({ x: e.point.x, y: e.point.y, z: e.point.z, radius: sphere?.radius ?? 2.0 })
          }}
        >
          <planeGeometry args={[1000, 1000]} />
          <meshBasicMaterial visible={false} side={THREE.DoubleSide} />
        </mesh>
      )}
      <group rotation={modelRotation}>
        {visibleSegments.map((seg) => (
          <SegmentMesh
            key={seg.id}
            seg={seg}
            isPending={pendingSegmentIds.includes(seg.id)}
            groupColor={assignedMap.get(seg.id) ?? null}
            dimmed={anyPending && !pendingSegmentIds.includes(seg.id) && !assignedMap.has(seg.id)}
            onClick={() => togglePendingSegment(seg.id)}
          />
        ))}
        <NodeOverlay />
      </group>
      {selectionMode === 'sphere' && sphere !== null && <SphereSelector />}
    </>
  )
}

function StepGate() {
  const step = useStudioStore((s) => s.step)
  return step === 3 ? <AnimateContent /> : <SceneContent />
}

export function StudioScene() {
  return (
    <Canvas
      camera={{ position: [0, 8, 16], fov: 50 }}
      style={{ background: '#4a4a4a', width: '100%', height: '100%' }}
    >
      <ambientLight intensity={1.2} />
      <directionalLight position={[5, 12, 8]} intensity={1.8} />
      <directionalLight position={[-5, 6, -8]} intensity={0.6} />
      <OrbitControls
        makeDefault
        mouseButtons={{
          LEFT: THREE.MOUSE.PAN,
          MIDDLE: THREE.MOUSE.ROTATE,
          RIGHT: THREE.MOUSE.ROTATE,
        }}
      />
      <StepGate />
      <CameraController />
    </Canvas>
  )
}
