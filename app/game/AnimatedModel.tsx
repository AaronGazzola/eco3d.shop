'use client'

import { useMemo, useRef, useState, useEffect, MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CreatureConfig } from '../page.types'
import { ModelConfigRow, SegmentData, BodyGroup } from '../studio/page.types'
import { useCreature, LimbState } from './useCreature'
import { Chain3D } from './chain3d'
import {
  MAX_SEGMENTS,
  MAX_LIMBS,
  SPINE_NODE_RADIUS,
  FOOT_RADIUS,
  LIMB_JOINT_RADIUS,
  SPINE_COLOR,
  LIMB_COLOR,
  FOOT_COLOR,
  LIMB_JOINT_COLOR,
} from './SkeletonRenderer.constants'

const BATCH_SIZE = 8
const _dummy = new THREE.Object3D()

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

function SkeletonOverlay({
  chainRef,
  limbStatesRef,
}: {
  chainRef: MutableRefObject<Chain3D | null>
  limbStatesRef: MutableRefObject<LimbState[]>
}) {
  const { scene } = useThree()
  const spineGeomRef = useRef<THREE.BufferGeometry | null>(null)
  const limbGeomRef = useRef<THREE.BufferGeometry | null>(null)
  const nodesMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const footMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const limbJointMeshRef = useRef<THREE.InstancedMesh | null>(null)

  useEffect(() => {
    const spineGeom = new THREE.BufferGeometry()
    const spineMat = new THREE.LineBasicMaterial({ color: SPINE_COLOR })
    const spineLine = new THREE.Line(spineGeom, spineMat)
    scene.add(spineLine)
    spineGeomRef.current = spineGeom

    const limbGeom = new THREE.BufferGeometry()
    const limbMat = new THREE.LineBasicMaterial({ color: LIMB_COLOR })
    const limbLine = new THREE.LineSegments(limbGeom, limbMat)
    scene.add(limbLine)
    limbGeomRef.current = limbGeom

    const sphereGeom = new THREE.SphereGeometry(SPINE_NODE_RADIUS, 8, 8)
    const whiteMat = new THREE.MeshStandardMaterial({ color: SPINE_COLOR })
    const nodesMesh = new THREE.InstancedMesh(sphereGeom, whiteMat, MAX_SEGMENTS)
    nodesMesh.count = 0
    scene.add(nodesMesh)
    nodesMeshRef.current = nodesMesh

    const footGeom = new THREE.SphereGeometry(FOOT_RADIUS, 8, 8)
    const greenMat = new THREE.MeshStandardMaterial({ color: FOOT_COLOR })
    const footMesh = new THREE.InstancedMesh(footGeom, greenMat, MAX_LIMBS)
    footMesh.count = 0
    scene.add(footMesh)
    footMeshRef.current = footMesh

    const jGeom = new THREE.SphereGeometry(LIMB_JOINT_RADIUS, 6, 6)
    const amberMat = new THREE.MeshStandardMaterial({ color: LIMB_JOINT_COLOR })
    const jointMesh = new THREE.InstancedMesh(jGeom, amberMat, MAX_LIMBS * 3)
    jointMesh.count = 0
    scene.add(jointMesh)
    limbJointMeshRef.current = jointMesh

    return () => {
      scene.remove(spineLine)
      scene.remove(limbLine)
      scene.remove(nodesMesh)
      scene.remove(footMesh)
      scene.remove(jointMesh)
      spineGeom.dispose()
      limbGeom.dispose()
      sphereGeom.dispose()
      footGeom.dispose()
      jGeom.dispose()
      spineMat.dispose()
      limbMat.dispose()
      whiteMat.dispose()
      greenMat.dispose()
      amberMat.dispose()
    }
  }, [scene])

  useFrame(() => {
    const chain = chainRef.current
    if (!chain) return

    const n = chain.joints.length
    const arr = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      arr[i * 3] = chain.joints[i].x
      arr[i * 3 + 1] = chain.joints[i].y
      arr[i * 3 + 2] = chain.joints[i].z
    }
    if (spineGeomRef.current) {
      spineGeomRef.current.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    }
    if (nodesMeshRef.current) {
      nodesMeshRef.current.count = n
      for (let i = 0; i < n; i++) {
        _dummy.position.copy(chain.joints[i])
        _dummy.updateMatrix()
        nodesMeshRef.current.setMatrixAt(i, _dummy.matrix)
      }
      nodesMeshRef.current.instanceMatrix.needsUpdate = true
    }

    const limbs = limbStatesRef.current
    const ptr: number[] = []
    limbs.forEach((limb) => {
      ptr.push(limb.anchor.x, limb.anchor.y, limb.anchor.z, limb.currentTarget.x, limb.currentTarget.y, limb.currentTarget.z)
    })
    if (limbGeomRef.current) {
      limbGeomRef.current.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(ptr), 3)
      )
      limbGeomRef.current.computeBoundingSphere()
    }

    if (footMeshRef.current) {
      footMeshRef.current.count = limbs.length
      limbs.forEach((limb, i) => {
        _dummy.position.copy(limb.currentTarget)
        _dummy.updateMatrix()
        footMeshRef.current!.setMatrixAt(i, _dummy.matrix)
      })
      footMeshRef.current.instanceMatrix.needsUpdate = true
    }

    if (limbJointMeshRef.current) {
      limbJointMeshRef.current.count = limbs.length
      limbs.forEach((limb, i) => {
        _dummy.position.copy(limb.anchor)
        _dummy.updateMatrix()
        limbJointMeshRef.current!.setMatrixAt(i, _dummy.matrix)
      })
      limbJointMeshRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return null
}

function SegmentMesh({
  positions,
  color,
  offsetX,
  offsetZ,
  transparent,
}: {
  positions: Float32Array
  color: string
  offsetX: number
  offsetZ: number
  transparent: boolean
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
      <meshStandardMaterial
        key={transparent ? 'transparent' : 'opaque'}
        color={color}
        roughness={0.5}
        metalness={0.05}
        transparent={transparent}
        opacity={transparent ? 0.18 : 1}
      />
    </mesh>
  )
}

export function AnimatedModel({
  creatureConfig,
  modelConfig,
  segments,
  targetRef,
  showSkeleton,
}: {
  creatureConfig: CreatureConfig
  modelConfig: ModelConfigRow
  segments: SegmentData[]
  targetRef: MutableRefObject<THREE.Vector3>
  showSkeleton?: boolean
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

  const nodePositions = useMemo(() => {
    const map = new Map<string, { x: number; z: number }>()
    spineChain.forEach((g, i) => {
      const prev = i > 0 ? spineChain[i - 1] : null
      const front = i === 0
        ? (g.nodeFront ?? centroid(g, segmentMap))
        : (prev!.nodeBack ?? centroid(prev!, segmentMap))
      map.set(g.id, { x: front.x, z: front.z })
    })
    legGroups.forEach((g) => {
      const spineGroup = modelConfig.groups.find((sg) => sg.id === g.attachedToSpineId)
      const hipNode = spineGroup
        ? (g.type === 'leg-left' ? spineGroup.nodeHipLeft : spineGroup.nodeHipRight)
        : undefined
      if (hipNode) {
        map.set(g.id, { x: hipNode.x, z: hipNode.z })
      } else if (g.nodeFoot) {
        map.set(g.id, { x: g.nodeFoot.x, z: g.nodeFoot.z })
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
        return Math.atan2(g.nodeFoot.z - hipNode.z, g.nodeFoot.x - hipNode.x)
      }
      return 0
    })
  }, [legGroups, modelConfig.groups])

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
        const boneAngle = Math.atan2(joint1.z - joint0.z, joint1.x - joint0.x)
        obj.position.set(joint0.x, 0, joint0.z)
        obj.rotation.y = restAngles[segIdx] + Math.PI - boneAngle
        return
      }

      const limbIdx = legGroupIndexMap.get(groupId)
      if (limbIdx === undefined) return
      const limb = limbStatesRef.current[limbIdx]
      if (!limb) return

      const worldAngle = Math.atan2(
        limb.currentTarget.z - limb.anchor.z,
        limb.currentTarget.x - limb.anchor.x
      )
      obj.position.set(limb.anchor.x, 0, limb.anchor.z)
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
                  transparent={!!showSkeleton}
                />
              )
            })}
          </group>
        )
      })}
      {showSkeleton && (
        <SkeletonOverlay chainRef={chainRef} limbStatesRef={limbStatesRef} />
      )}
    </group>
  )
}
