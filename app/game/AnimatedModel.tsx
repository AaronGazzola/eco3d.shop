'use client'

import { useMemo, useRef, useState, useEffect, MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CreatureConfig } from '../page.types'
import { ModelConfigRow, SegmentData, BodyGroup } from '../studio/page.types'
import { useCreature } from './useCreature'

const BATCH_SIZE = 8

function resolveNodePos(
  group: BodyGroup,
  segmentMap: Map<string, SegmentData>
): { x: number; z: number } {
  if (group.nodePosition) return group.nodePosition
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

function getSpineChain(modelConfig: ModelConfigRow): BodyGroup[] {
  const head = modelConfig.groups.find((g) => g.type === 'head')
  const tail = modelConfig.groups.find((g) => g.type === 'tail')
  const spines = modelConfig.groups.filter((g) => g.type === 'spine')
  return [...(head ? [head] : []), ...spines, ...(tail ? [tail] : [])]
}

function SegmentMesh({
  positions,
  color,
  offsetX,
  offsetZ,
}: {
  positions: Float32Array
  color: string
  offsetX: number
  offsetZ: number
}) {
  const geometry = useMemo(() => {
    const arr = positions.slice()
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] += offsetX
      arr[i + 2] += offsetZ
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    geo.computeVertexNormals()
    return geo
  }, [positions, offsetX, offsetZ])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={color} roughness={0.5} metalness={0.05} />
    </mesh>
  )
}

export function AnimatedModel({
  creatureConfig,
  modelConfig,
  segments,
  targetRef,
}: {
  creatureConfig: CreatureConfig
  modelConfig: ModelConfigRow
  segments: SegmentData[]
  targetRef: MutableRefObject<THREE.Vector3>
}) {
  const { chainRef } = useCreature(creatureConfig, targetRef)
  const groupRefsRef = useRef<Map<string, THREE.Group>>(new Map())

  const segmentMap = useMemo(() => new Map(segments.map((s) => [s.id, s])), [segments])

  const spineChain = useMemo(() => getSpineChain(modelConfig), [modelConfig])

  const legGroups = useMemo(
    () =>
      modelConfig.groups.filter(
        (g) => (g.type === 'leg-left' || g.type === 'leg-right') && g.attachedToSpineId
      ),
    [modelConfig.groups]
  )

  const allGroups = useMemo(() => [...spineChain, ...legGroups], [spineChain, legGroups])

  const nodePositions = useMemo(
    () => new Map(allGroups.map((g) => [g.id, resolveNodePos(g, segmentMap)])),
    [allGroups, segmentMap]
  )

  const chainIndexMap = useMemo(
    () => new Map(spineChain.map((g, i) => [g.id, i])),
    [spineChain]
  )

  // restAngle[i] = "toward head" direction in model space for joint i
  const restAngles = useMemo(() => {
    return spineChain.map((g, i) => {
      const curr = nodePositions.get(g.id)!
      if (i === 0) {
        const next = spineChain[1] ? nodePositions.get(spineChain[1].id)! : curr
        return Math.atan2(curr.z - next.z, curr.x - next.x)
      }
      const prev = nodePositions.get(spineChain[i - 1].id)!
      return Math.atan2(prev.z - curr.z, prev.x - curr.x)
    })
  }, [spineChain, nodePositions])

  const [renderCount, setRenderCount] = useState(0)

  useEffect(() => {
    if (allGroups.length === 0) { setRenderCount(0); return }
    let count = 0
    let raf: number
    function addBatch() {
      count = Math.min(count + BATCH_SIZE, allGroups.length)
      setRenderCount(count)
      if (count < allGroups.length) raf = requestAnimationFrame(addBatch)
    }
    raf = requestAnimationFrame(addBatch)
    return () => cancelAnimationFrame(raf)
  }, [allGroups])

  useFrame(() => {
    const chain = chainRef.current
    if (!chain) return

    groupRefsRef.current.forEach((obj, groupId) => {
      const chainIdx = chainIndexMap.get(groupId)

      if (chainIdx !== undefined && chainIdx < chain.joints.length) {
        const joint = chain.joints[chainIdx]
        obj.position.set(joint.x, 0, joint.z)
        obj.rotation.y = restAngles[chainIdx] - chain.angles[chainIdx]
        return
      }

      const legGroup = modelConfig.groups.find((g) => g.id === groupId)
      if (!legGroup?.attachedToSpineId) return
      const parentIdx = chainIndexMap.get(legGroup.attachedToSpineId)
      if (parentIdx === undefined || parentIdx >= chain.joints.length) return

      const parentJoint = chain.joints[parentIdx]
      const parentAngle = chain.angles[parentIdx]
      const side = legGroup.type === 'leg-left' ? -1 : 1
      const sideAngle = parentAngle + (Math.PI / 2) * side

      obj.position.set(
        parentJoint.x + Math.cos(sideAngle) * creatureConfig.bodyHalfWidth,
        0,
        parentJoint.z + Math.sin(sideAngle) * creatureConfig.bodyHalfWidth
      )
      obj.rotation.y = restAngles[parentIdx] - parentAngle
    })
  })

  const visibleGroups = allGroups.slice(0, renderCount)

  return (
    <group>
      {visibleGroups.map((g) => {
        const np = nodePositions.get(g.id) ?? { x: 0, z: 0 }
        return (
          <group
            key={g.id}
            ref={(el) => {
              if (el) groupRefsRef.current.set(g.id, el)
              else groupRefsRef.current.delete(g.id)
            }}
          >
            {g.segmentIds.map((sid) => {
              const seg = segmentMap.get(sid)
              if (!seg) return null
              return (
                <SegmentMesh
                  key={sid}
                  positions={seg.positions}
                  color={g.color}
                  offsetX={-np.x}
                  offsetZ={-np.z}
                />
              )
            })}
          </group>
        )
      })}
    </group>
  )
}
