'use client'

import { ReactNode, useCallback, useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { BodyGroup, SegmentData } from '@/app/admin/_lib/types'
import { StaticGroupBody } from './StaticDragon'
import { buildSkeletonTree, flattenSkeleton } from './skeleton'
import type { Cycle, Pose } from './animation.types'
import { advancePhase, evaluateCycle, wrapPhase } from './animation'

type Anchor = [number, number, number]

type JointRefs = Record<string, THREE.Group | null>

type RegisterJoint = (groupId: string, node: THREE.Group | null) => void

function toAnchor(node?: { x: number; y?: number; z: number }): Anchor | null {
  if (!node) return null
  return [node.x, node.y ?? 0, node.z]
}

function Pivot({
  anchor,
  groupId,
  register,
  children,
}: {
  anchor: Anchor
  groupId: string
  register: RegisterJoint
  children: ReactNode
}) {
  const ref = useRef<THREE.Group>(null)

  useEffect(() => {
    register(groupId, ref.current)
    return () => register(groupId, null)
  }, [groupId, register])

  return (
    <group ref={ref} position={anchor}>
      <group position={[-anchor[0], -anchor[1], -anchor[2]]}>{children}</group>
    </group>
  )
}

function LegPivots({
  legs,
  parent,
  segmentMap,
  register,
  opacity,
}: {
  legs: BodyGroup[]
  parent: BodyGroup
  segmentMap: Map<string, SegmentData>
  register: RegisterJoint
  opacity: number
}) {
  return (
    <>
      {legs.map((leg) => {
        const hip =
          leg.type === 'leg-left' ? toAnchor(parent.nodeHipLeft) : toAnchor(parent.nodeHipRight)
        if (!hip) {
          return (
            <StaticGroupBody key={leg.id} group={leg} segmentMap={segmentMap} opacity={opacity} />
          )
        }
        return (
          <Pivot key={leg.id} anchor={hip} groupId={leg.id} register={register}>
            <StaticGroupBody group={leg} segmentMap={segmentMap} opacity={opacity} />
          </Pivot>
        )
      })}
    </>
  )
}

function Hinge({
  chain,
  index,
  anchor,
  legsByParent,
  segmentMap,
  register,
  opacity,
}: {
  chain: BodyGroup[]
  index: number
  anchor: Anchor
  legsByParent: Map<string, BodyGroup[]>
  segmentMap: Map<string, SegmentData>
  register: RegisterJoint
  opacity: number
}) {
  if (index >= chain.length) return null

  const group = chain[index]
  const nextAnchor = toAnchor(group.nodeBack) ?? toAnchor(group.nodeFront) ?? anchor
  const legs = legsByParent.get(group.id) ?? []

  return (
    <Pivot anchor={anchor} groupId={group.id} register={register}>
      <StaticGroupBody group={group} segmentMap={segmentMap} opacity={opacity} />
      {legs.length > 0 && (
        <LegPivots
          legs={legs}
          parent={group}
          segmentMap={segmentMap}
          register={register}
          opacity={opacity}
        />
      )}
      <Hinge
        chain={chain}
        index={index + 1}
        anchor={nextAnchor}
        legsByParent={legsByParent}
        segmentMap={segmentMap}
        register={register}
        opacity={opacity}
      />
    </Pivot>
  )
}

export function AnimatedDragon({
  groups,
  segments,
  cycle,
  playing = true,
  phase,
  onPhase,
  poseSource,
  opacity = 1,
}: {
  groups: BodyGroup[]
  segments: SegmentData[]
  cycle: Cycle
  playing?: boolean
  phase?: number
  onPhase?: (phase: number) => void
  poseSource?: (dt: number) => Pose
  opacity?: number
}) {
  const rootRef = useRef<THREE.Group>(null)
  const jointRefs = useRef<JointRefs>({})
  const phaseRef = useRef(0)

  const register = useCallback<RegisterJoint>((groupId, node) => {
    if (node) jointRefs.current[groupId] = node
    else delete jointRefs.current[groupId]
  }, [])

  const segmentMap = useMemo(() => new Map(segments.map((s) => [s.id, s])), [segments])
  const chain = useMemo(() => flattenSkeleton(buildSkeletonTree(groups)), [groups])

  const legsByParent = useMemo(() => {
    const map = new Map<string, BodyGroup[]>()
    const known = new Set(groups.map((g) => g.id))
    for (const g of groups) {
      if (g.type !== 'leg-left' && g.type !== 'leg-right') continue
      const parentId = g.attachedToSpineId
      if (!parentId || !known.has(parentId)) {
        console.error(`Leg ${g.id} has no resolvable parent group; rendering at the model root`)
        continue
      }
      const list = map.get(parentId) ?? []
      list.push(g)
      map.set(parentId, list)
    }
    return map
  }, [groups])

  const orphanLegs = useMemo(
    () =>
      groups.filter(
        (g) =>
          (g.type === 'leg-left' || g.type === 'leg-right') &&
          !(g.attachedToSpineId && groups.some((p) => p.id === g.attachedToSpineId)),
      ),
    [groups],
  )

  const unchained = useMemo(() => {
    const inChain = new Set(chain.map((g) => g.id))
    const inLegs = new Set(groups.filter((g) => g.type.startsWith('leg-')).map((g) => g.id))
    return groups.filter((g) => !inChain.has(g.id) && !inLegs.has(g.id))
  }, [chain, groups])

  useEffect(() => {
    if (phase !== undefined) phaseRef.current = wrapPhase(phase)
  }, [phase])

  useFrame((_, delta) => {
    if (!poseSource && playing) {
      phaseRef.current = advancePhase(phaseRef.current, cycle.speed, delta)
      onPhase?.(phaseRef.current)
    }

    const pose = poseSource ? poseSource(delta) : evaluateCycle(cycle, phaseRef.current)

    if (rootRef.current) {
      rootRef.current.position.set(pose.root.x, 0, pose.root.z)
      rootRef.current.rotation.y = pose.root.yawRad
    }

    for (const g of groups) {
      const node = jointRefs.current[g.id]
      if (!node) continue
      const joint = pose.joints[g.id]
      const yaw = joint?.yawRad ?? 0
      const pitch = joint?.pitchRad ?? 0
      if (g.type === 'leg-left' || g.type === 'leg-right') {
        node.rotation.set(pitch, 0, yaw)
      } else {
        node.rotation.set(0, yaw, pitch)
      }
    }
  })

  const head = chain[0]
  const headAnchor = head ? toAnchor(head.nodeBack) ?? toAnchor(head.nodeFront) : null
  const restAnchor: Anchor = [0, 0, 0]

  return (
    <group ref={rootRef}>
      {head && headAnchor && (
        <>
          <Pivot anchor={headAnchor} groupId={head.id} register={register}>
            <StaticGroupBody group={head} segmentMap={segmentMap} opacity={opacity} />
            <LegPivots
              legs={legsByParent.get(head.id) ?? []}
              parent={head}
              segmentMap={segmentMap}
              register={register}
              opacity={opacity}
            />
          </Pivot>
          <Hinge
            chain={chain}
            index={1}
            anchor={headAnchor}
            legsByParent={legsByParent}
            segmentMap={segmentMap}
            register={register}
            opacity={opacity}
          />
        </>
      )}
      {head && !headAnchor && (
        <Hinge
          chain={chain}
          index={0}
          anchor={restAnchor}
          legsByParent={legsByParent}
          segmentMap={segmentMap}
          register={register}
          opacity={opacity}
        />
      )}
      {orphanLegs.map((leg) => (
        <StaticGroupBody key={leg.id} group={leg} segmentMap={segmentMap} opacity={opacity} />
      ))}
      {unchained.map((g) => (
        <StaticGroupBody key={g.id} group={g} segmentMap={segmentMap} opacity={opacity} />
      ))}
    </group>
  )
}
