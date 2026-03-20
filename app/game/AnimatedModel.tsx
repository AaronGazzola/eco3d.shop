'use client'

import { useMemo, useRef, useState, useEffect, MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CreatureConfig } from '../page.types'
import { ModelConfigRow, SegmentData, BodyGroup } from '../studio/page.types'
import { useCreature } from './useCreature'

const BATCH_SIZE = 8


function getSpineChain(modelConfig: ModelConfigRow): BodyGroup[] {
  const head = modelConfig.groups.find((g) => g.type === 'head')
  const tail = modelConfig.groups.find((g) => g.type === 'tail')
  const spines = modelConfig.groups.filter((g) => g.type === 'spine')
  return [...(head ? [head] : []), ...spines, ...(tail ? [tail] : [])]
}

function centroid(group: BodyGroup, segmentMap: Map<string, SegmentData>): { x: number; z: number } {
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
  const { chainRef, limbStatesRef } = useCreature(creatureConfig, targetRef)
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

  // nodePositions: midpoint of each group's actual front and back in model space
  const nodePositions = useMemo(() => {
    const map = new Map<string, { x: number; z: number }>()
    spineChain.forEach((g, i) => {
      const prev = i > 0 ? spineChain[i - 1] : null
      const front = i === 0
        ? (g.nodeFront ?? centroid(g, segmentMap))
        : (prev!.nodeBack ?? centroid(prev!, segmentMap))
      const back = g.nodeBack ?? centroid(g, segmentMap)
      map.set(g.id, { x: (front.x + back.x) / 2, z: (front.z + back.z) / 2 })
    })
    legGroups.forEach((g) => {
      const spineGroup = modelConfig.groups.find((sg) => sg.id === g.attachedToSpineId)
      const hipNode = spineGroup
        ? (g.type === 'leg-left' ? spineGroup.nodeHipLeft : spineGroup.nodeHipRight)
        : undefined
      if (hipNode && g.nodeFoot) {
        map.set(g.id, { x: (hipNode.x + g.nodeFoot.x) / 2, z: (hipNode.z + g.nodeFoot.z) / 2 })
      } else if (hipNode) {
        map.set(g.id, { x: hipNode.x, z: hipNode.z })
      } else {
        map.set(g.id, centroid(g, segmentMap))
      }
    })
    return map
  }, [spineChain, legGroups, segmentMap, modelConfig.groups])

  const legGroupIndexMap = useMemo(
    () => new Map(legGroups.map((g, i) => [g.id, i])),
    [legGroups]
  )

  const chainSegmentIndexMap = useMemo(() => {
    const map = new Map<string, number>()
    spineChain.forEach((g, i) => map.set(g.id, i))
    return map
  }, [spineChain])

  const restAngles = useMemo(() => {
    return spineChain.map((g, i) => {
      const prev = i > 0 ? spineChain[i - 1] : null
      const front = i === 0
        ? (g.nodeFront ?? centroid(g, segmentMap))
        : (prev!.nodeBack ?? centroid(prev!, segmentMap))
      const back = g.nodeBack ?? centroid(g, segmentMap)
      return Math.atan2(front.z - back.z, front.x - back.x)
    })
  }, [spineChain, segmentMap])

  const legRestAngles = useMemo(() => {
    return legGroups.map((g) => {
      const spineGroup = modelConfig.groups.find((sg) => sg.id === g.attachedToSpineId)
      const hipNode = spineGroup
        ? (g.type === 'leg-left' ? spineGroup.nodeHipLeft : spineGroup.nodeHipRight)
        : undefined
      if (hipNode && g.nodeFoot) {
        return Math.atan2(hipNode.z - g.nodeFoot.z, hipNode.x - g.nodeFoot.x)
      }
      const legNp = nodePositions.get(g.id)
      const parentNp = g.attachedToSpineId ? nodePositions.get(g.attachedToSpineId) : undefined
      if (!legNp || !parentNp) return 0
      return Math.atan2(parentNp.z - legNp.z, parentNp.x - legNp.x)
    })
  }, [legGroups, nodePositions, modelConfig.groups])

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
      const segIdx = chainSegmentIndexMap.get(groupId)
      if (segIdx !== undefined && segIdx + 1 < chain.joints.length) {
        const joint0 = chain.joints[segIdx]
        const joint1 = chain.joints[segIdx + 1]
        obj.position.set((joint0.x + joint1.x) / 2, 0, (joint0.z + joint1.z) / 2)
        obj.rotation.y = restAngles[segIdx] - chain.angles[segIdx]
        return
      }

      const limbIdx = legGroupIndexMap.get(groupId)
      if (limbIdx === undefined) return
      const limb = limbStatesRef.current[limbIdx]
      if (!limb) return

      const legG = legGroups[limbIdx]
      const parentSegIdx = legG.attachedToSpineId
        ? (chainSegmentIndexMap.get(legG.attachedToSpineId) ?? 0)
        : 0
      const safeParentIdx = Math.min(parentSegIdx, chain.joints.length - 1)
      const parentJoint = chain.joints[safeParentIdx]

      const worldAngle = Math.atan2(
        parentJoint.z - limb.currentTarget.z,
        parentJoint.x - limb.currentTarget.x
      )
      obj.position.set(limb.currentTarget.x, 0, limb.currentTarget.z)
      obj.rotation.y = legRestAngles[limbIdx] - worldAngle
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
