'use client'

import { useMemo } from 'react'
import { BodyGroup, SegmentData } from '@/app/admin/_lib/types'
import { useGroupSegments, useMergedGeometry } from './StaticDragon'

const NEUTRAL_PIECE_COLOR = '#8a8479'

// Matte, not the studio's slightly glossy preview material. A PHA print has no sheen, and a specular
// highlight on every piece reads as plastic toy rather than as the object that arrives in the post.
function PaintedMesh({ segments, color, opacity }: { segments: SegmentData[]; color: string; opacity: number }) {
  const geometry = useMergedGeometry(segments)
  const isTransparent = opacity < 1
  if (opacity <= 0.001 || !geometry) return null

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        key={isTransparent ? 'transparent' : 'opaque'}
        color={color}
        roughness={0.95}
        metalness={0}
        transparent={isTransparent}
        opacity={opacity}
        depthWrite={!isTransparent}
      />
    </mesh>
  )
}

// Colour belongs to the PIECE, not to the body part. A group's pieces are bucketed by their own colour
// and one merged mesh is drawn per bucket, so a head made of forty pieces can carry all three filaments
// rather than being one solid block.
export function PaintedGroupBody({
  group,
  segmentMap,
  segmentColors,
  opacity,
}: {
  group: BodyGroup
  segmentMap: Map<string, SegmentData>
  segmentColors: Record<string, string>
  opacity: number
}) {
  const segments = useGroupSegments(group, segmentMap)
  const buckets = useMemo(() => {
    const byColor = new Map<string, SegmentData[]>()
    for (const s of segments) {
      const color = segmentColors[s.id] ?? NEUTRAL_PIECE_COLOR
      const list = byColor.get(color)
      if (list) list.push(s)
      else byColor.set(color, [s])
    }
    return Array.from(byColor.entries()).map(([color, segs]) => ({ color, segments: segs }))
  }, [segments, segmentColors])

  return (
    <>
      {buckets.map((b) => (
        <PaintedMesh key={b.color} segments={b.segments} color={b.color} opacity={opacity} />
      ))}
    </>
  )
}
