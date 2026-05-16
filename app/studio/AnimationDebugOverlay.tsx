'use client'

import { useEffect, useRef, MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Chain3D } from '../game/chain3d'
import { LimbState } from '../game/useCreature'

const MAX_JOINTS = 64
const MAX_LIMBS = 16

const JOINT_COLOR = '#22d3ee'
const BONE_COLOR = '#22d3ee'
const HIP_COLOR = '#f472b6'
const FOOT_COLOR = '#34d399'

const JOINT_RADIUS = 0.12
const HIP_RADIUS = 0.14
const FOOT_RADIUS = 0.14

const _dummy = new THREE.Object3D()

export function AnimationDebugOverlay({
  chainRef,
  limbStatesRef,
}: {
  chainRef: MutableRefObject<Chain3D | null>
  limbStatesRef: MutableRefObject<LimbState[]>
}) {
  const { scene } = useThree()

  const jointsMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const bonesGeomRef = useRef<THREE.BufferGeometry | null>(null)
  const hipsMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const footsMeshRef = useRef<THREE.InstancedMesh | null>(null)

  useEffect(() => {
    const ignoreRaycast = () => null
    const overlayDepth = (mat: THREE.Material) => {
      mat.depthTest = false
      mat.depthWrite = false
      mat.transparent = true
    }

    const jointGeom = new THREE.SphereGeometry(JOINT_RADIUS, 10, 8)
    const jointMat = new THREE.MeshBasicMaterial({ color: JOINT_COLOR })
    overlayDepth(jointMat)
    const jointsMesh = new THREE.InstancedMesh(jointGeom, jointMat, MAX_JOINTS)
    jointsMesh.count = 0
    jointsMesh.renderOrder = 999
    jointsMesh.raycast = ignoreRaycast
    scene.add(jointsMesh)
    jointsMeshRef.current = jointsMesh

    const bonesGeom = new THREE.BufferGeometry()
    bonesGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_JOINTS * 2 * 3), 3))
    const bonesMat = new THREE.LineBasicMaterial({ color: BONE_COLOR, linewidth: 2 })
    overlayDepth(bonesMat)
    const bonesLine = new THREE.LineSegments(bonesGeom, bonesMat)
    bonesLine.renderOrder = 999
    bonesLine.frustumCulled = false
    bonesLine.raycast = ignoreRaycast
    scene.add(bonesLine)
    bonesGeomRef.current = bonesGeom

    const hipGeom = new THREE.SphereGeometry(HIP_RADIUS, 8, 8)
    const hipMat = new THREE.MeshBasicMaterial({ color: HIP_COLOR })
    overlayDepth(hipMat)
    const hipsMesh = new THREE.InstancedMesh(hipGeom, hipMat, MAX_LIMBS)
    hipsMesh.count = 0
    hipsMesh.renderOrder = 999
    hipsMesh.raycast = ignoreRaycast
    scene.add(hipsMesh)
    hipsMeshRef.current = hipsMesh

    const footGeom = new THREE.SphereGeometry(FOOT_RADIUS, 10, 8)
    const footMat = new THREE.MeshBasicMaterial({ color: FOOT_COLOR })
    overlayDepth(footMat)
    const footsMesh = new THREE.InstancedMesh(footGeom, footMat, MAX_LIMBS)
    footsMesh.count = 0
    footsMesh.renderOrder = 999
    footsMesh.raycast = ignoreRaycast
    scene.add(footsMesh)
    footsMeshRef.current = footsMesh

    return () => {
      scene.remove(jointsMesh)
      scene.remove(bonesLine)
      scene.remove(hipsMesh)
      scene.remove(footsMesh)
      jointGeom.dispose()
      jointMat.dispose()
      bonesGeom.dispose()
      bonesMat.dispose()
      hipGeom.dispose()
      hipMat.dispose()
      footGeom.dispose()
      footMat.dispose()
    }
  }, [scene])

  useFrame(() => {
    const chain = chainRef.current
    const limbs = limbStatesRef.current
    if (!chain) return

    const n = chain.joints.length
    const limbCount = Math.min(limbs.length, MAX_LIMBS)

    const jointsMesh = jointsMeshRef.current
    if (jointsMesh) {
      const count = Math.min(n, MAX_JOINTS)
      jointsMesh.count = count
      for (let i = 0; i < count; i++) {
        _dummy.position.copy(chain.joints[i])
        _dummy.rotation.set(0, 0, 0)
        _dummy.scale.setScalar(1)
        _dummy.updateMatrix()
        jointsMesh.setMatrixAt(i, _dummy.matrix)
      }
      jointsMesh.instanceMatrix.needsUpdate = true
    }

    const bonesGeom = bonesGeomRef.current
    if (bonesGeom && n >= 2) {
      const segCount = Math.min(n - 1, MAX_JOINTS - 1)
      const pos = bonesGeom.getAttribute('position') as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      for (let i = 0; i < segCount; i++) {
        const a = chain.joints[i]
        const b = chain.joints[i + 1]
        arr[i * 6] = a.x
        arr[i * 6 + 1] = a.y
        arr[i * 6 + 2] = a.z
        arr[i * 6 + 3] = b.x
        arr[i * 6 + 4] = b.y
        arr[i * 6 + 5] = b.z
      }
      for (let i = segCount * 6; i < arr.length; i++) arr[i] = 0
      pos.needsUpdate = true
      bonesGeom.setDrawRange(0, segCount * 2)
    }

    const hipsMesh = hipsMeshRef.current
    if (hipsMesh) {
      hipsMesh.count = limbCount
      for (let i = 0; i < limbCount; i++) {
        _dummy.position.copy(limbs[i].anchor)
        _dummy.rotation.set(0, 0, 0)
        _dummy.scale.setScalar(1)
        _dummy.updateMatrix()
        hipsMesh.setMatrixAt(i, _dummy.matrix)
      }
      hipsMesh.instanceMatrix.needsUpdate = true
    }

    const footsMesh = footsMeshRef.current
    if (footsMesh) {
      footsMesh.count = limbCount
      for (let i = 0; i < limbCount; i++) {
        _dummy.position.copy(limbs[i].currentTarget)
        _dummy.rotation.set(0, 0, 0)
        _dummy.scale.setScalar(1)
        _dummy.updateMatrix()
        footsMesh.setMatrixAt(i, _dummy.matrix)
      }
      footsMesh.instanceMatrix.needsUpdate = true
    }
  })

  return null
}
