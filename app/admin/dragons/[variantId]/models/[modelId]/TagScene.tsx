'use client'

import { useMemo } from 'react'
import * as THREE from 'three'
import { StudioCanvas } from '@/app/admin/_lib/StudioCanvas'
import type { SegmentData } from '@/app/admin/_lib/types'
import { useTagEditorStore } from './page.stores'

const NEUTRAL = '#9ca3af'
const SELECTED = '#ffffff'

function SegmentMesh({
  seg,
  color,
  selected,
  onClick,
}: {
  seg: SegmentData
  color: string
  selected: boolean
  onClick: () => void
}) {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(seg.positions, 3))
    g.computeVertexNormals()
    return g
  }, [seg.positions])

  return (
    <mesh
      geometry={geom}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <meshStandardMaterial
        color={selected ? SELECTED : color}
        emissive={selected ? SELECTED : '#000000'}
        emissiveIntensity={selected ? 0.5 : 0}
        roughness={0.5}
        metalness={0.05}
      />
    </mesh>
  )
}

function SceneContent({
  segments,
  roleColors,
  modelRotation,
}: {
  segments: SegmentData[]
  roleColors: Record<string, string>
  modelRotation: [number, number, number]
}) {
  const roleTags = useTagEditorStore((s) => s.roleTags)
  const selection = useTagEditorStore((s) => s.selection)
  const toggleSegment = useTagEditorStore((s) => s.toggleSegment)

  const selectionSet = useMemo(() => new Set(selection), [selection])

  return (
    <group rotation={modelRotation}>
      {segments.map((seg) => {
        const role = roleTags[seg.id]
        const color = (role && roleColors[role]) || NEUTRAL
        return (
          <SegmentMesh
            key={seg.id}
            seg={seg}
            color={color}
            selected={selectionSet.has(seg.id)}
            onClick={() => toggleSegment(seg.id)}
          />
        )
      })}
    </group>
  )
}

export function TagScene({
  segments,
  roleColors,
  modelRotation,
}: {
  segments: SegmentData[]
  roleColors: Record<string, string>
  modelRotation: [number, number, number]
}) {
  return (
    <StudioCanvas>
      <SceneContent segments={segments} roleColors={roleColors} modelRotation={modelRotation} />
    </StudioCanvas>
  )
}
