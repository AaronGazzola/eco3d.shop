'use client'

import { MutableRefObject, useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { CreatureConfig } from '../page.types'
import { useCreature } from './useCreature'
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

const _dummy = new THREE.Object3D()

interface Props {
  config: CreatureConfig
  targetRef: MutableRefObject<THREE.Vector3>
  headPosRef: MutableRefObject<THREE.Vector3>
}

export function SkeletonRenderer({ config, targetRef, headPosRef }: Props) {
  const { scene } = useThree()

  const spineGeomRef = useRef<THREE.BufferGeometry | null>(null)
  const limbGeomRef = useRef<THREE.BufferGeometry | null>(null)
  const nodesMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const footMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const limbJointMeshRef = useRef<THREE.InstancedMesh | null>(null)

  const { chainRef, limbStatesRef } = useCreature(config, targetRef)

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

    headPosRef.current.copy(chain.joints[0])

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
      const a = limb.anchor
      const j = limb.joints
      ptr.push(a.x, a.y, a.z, j[0].x, j[0].y, j[0].z)
      ptr.push(j[0].x, j[0].y, j[0].z, j[1].x, j[1].y, j[1].z)
      ptr.push(j[1].x, j[1].y, j[1].z, j[2].x, j[2].y, j[2].z)
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
      let ji = 0
      limbs.forEach((limb) => {
        limb.joints.forEach((j) => {
          _dummy.position.copy(j)
          _dummy.updateMatrix()
          limbJointMeshRef.current!.setMatrixAt(ji++, _dummy.matrix)
        })
      })
      limbJointMeshRef.current.count = ji
      limbJointMeshRef.current.instanceMatrix.needsUpdate = true
    }
  })

  return null
}
