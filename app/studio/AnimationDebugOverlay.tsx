'use client'

import { useEffect, useRef, MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Chain3D } from '../game/chain3d'
import { LimbState } from '../game/useCreature'
import { useStudioStore } from './page.stores'

const MAX_JOINTS = 64
const MAX_LIMBS = 16

const JOINT_COLOR = '#22d3ee'
const BONE_COLOR = '#22d3ee'
const HIP_COLOR = '#f472b6'
const FOOT_CURRENT_COLOR = '#34d399'
const FOOT_DESIRED_COLOR = '#fbbf24'
const HEAD_TARGET_COLOR = '#a78bfa'

const JOINT_RADIUS = 0.12
const HIP_RADIUS = 0.14
const FOOT_RADIUS = 0.14
const FOOT_GHOST_RADIUS = 0.18

const _dummy = new THREE.Object3D()

export function AnimationDebugOverlay({
  chainRef,
  limbStatesRef,
  targetRef,
}: {
  chainRef: MutableRefObject<Chain3D | null>
  limbStatesRef: MutableRefObject<LimbState[]>
  targetRef: MutableRefObject<THREE.Vector3>
}) {
  const { scene } = useThree()
  const toggles = useStudioStore((s) => s.overlayToggles)

  const jointsMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const bonesGeomRef = useRef<THREE.BufferGeometry | null>(null)
  const bonesLineRef = useRef<THREE.LineSegments | null>(null)
  const hipsMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const footCurrentMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const footDesiredMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const headArrowGeomRef = useRef<THREE.BufferGeometry | null>(null)
  const headArrowLineRef = useRef<THREE.Line | null>(null)

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
    bonesLineRef.current = bonesLine

    const hipGeom = new THREE.SphereGeometry(HIP_RADIUS, 8, 8)
    const hipMat = new THREE.MeshBasicMaterial({ color: HIP_COLOR })
    overlayDepth(hipMat)
    const hipsMesh = new THREE.InstancedMesh(hipGeom, hipMat, MAX_LIMBS)
    hipsMesh.count = 0
    hipsMesh.renderOrder = 999
    hipsMesh.raycast = ignoreRaycast
    scene.add(hipsMesh)
    hipsMeshRef.current = hipsMesh

    const footCurrentGeom = new THREE.SphereGeometry(FOOT_RADIUS, 10, 8)
    const footCurrentMat = new THREE.MeshBasicMaterial({ color: FOOT_CURRENT_COLOR })
    overlayDepth(footCurrentMat)
    const footCurrentMesh = new THREE.InstancedMesh(footCurrentGeom, footCurrentMat, MAX_LIMBS)
    footCurrentMesh.count = 0
    footCurrentMesh.renderOrder = 999
    footCurrentMesh.raycast = ignoreRaycast
    scene.add(footCurrentMesh)
    footCurrentMeshRef.current = footCurrentMesh

    const footDesiredGeom = new THREE.SphereGeometry(FOOT_GHOST_RADIUS, 10, 8)
    const footDesiredMat = new THREE.MeshBasicMaterial({ color: FOOT_DESIRED_COLOR, wireframe: true })
    overlayDepth(footDesiredMat)
    const footDesiredMesh = new THREE.InstancedMesh(footDesiredGeom, footDesiredMat, MAX_LIMBS)
    footDesiredMesh.count = 0
    footDesiredMesh.renderOrder = 999
    footDesiredMesh.raycast = ignoreRaycast
    scene.add(footDesiredMesh)
    footDesiredMeshRef.current = footDesiredMesh

    const headArrowGeom = new THREE.BufferGeometry()
    headArrowGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(2 * 3), 3))
    const headArrowMat = new THREE.LineBasicMaterial({ color: HEAD_TARGET_COLOR })
    overlayDepth(headArrowMat)
    const headArrowLine = new THREE.Line(headArrowGeom, headArrowMat)
    headArrowLine.renderOrder = 999
    headArrowLine.frustumCulled = false
    headArrowLine.raycast = ignoreRaycast
    scene.add(headArrowLine)
    headArrowGeomRef.current = headArrowGeom
    headArrowLineRef.current = headArrowLine

    return () => {
      scene.remove(jointsMesh)
      scene.remove(bonesLine)
      scene.remove(hipsMesh)
      scene.remove(footCurrentMesh)
      scene.remove(footDesiredMesh)
      scene.remove(headArrowLine)
      jointGeom.dispose()
      jointMat.dispose()
      bonesGeom.dispose()
      bonesMat.dispose()
      hipGeom.dispose()
      hipMat.dispose()
      footCurrentGeom.dispose()
      footCurrentMat.dispose()
      footDesiredGeom.dispose()
      footDesiredMat.dispose()
      headArrowGeom.dispose()
      headArrowMat.dispose()
    }
  }, [scene])

  useEffect(() => {
    if (jointsMeshRef.current) jointsMeshRef.current.visible = toggles.joints
    if (bonesLineRef.current) bonesLineRef.current.visible = toggles.bones
    if (hipsMeshRef.current) hipsMeshRef.current.visible = toggles.hips
    if (footCurrentMeshRef.current) footCurrentMeshRef.current.visible = toggles.footTargets
    if (footDesiredMeshRef.current) footDesiredMeshRef.current.visible = toggles.footTargets
    if (headArrowLineRef.current) headArrowLineRef.current.visible = toggles.headTarget
  }, [toggles.joints, toggles.bones, toggles.hips, toggles.footTargets, toggles.headTarget])

  useFrame(() => {
    const chain = chainRef.current
    const limbs = limbStatesRef.current
    const jointsMesh = jointsMeshRef.current
    const bonesGeom = bonesGeomRef.current
    const hipsMesh = hipsMeshRef.current
    const footCurrentMesh = footCurrentMeshRef.current
    const footDesiredMesh = footDesiredMeshRef.current
    const headArrowGeom = headArrowGeomRef.current

    if (!chain || !jointsMesh || !bonesGeom || !hipsMesh || !footCurrentMesh || !footDesiredMesh || !headArrowGeom) return

    const n = chain.joints.length

    if (toggles.joints) {
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

    if (toggles.bones && n >= 2) {
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

    const limbCount = Math.min(limbs.length, MAX_LIMBS)

    if (toggles.hips) {
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

    if (toggles.footTargets) {
      footCurrentMesh.count = limbCount
      footDesiredMesh.count = limbCount
      for (let i = 0; i < limbCount; i++) {
        _dummy.position.copy(limbs[i].currentTarget)
        _dummy.rotation.set(0, 0, 0)
        _dummy.scale.setScalar(1)
        _dummy.updateMatrix()
        footCurrentMesh.setMatrixAt(i, _dummy.matrix)

        _dummy.position.copy(limbs[i].desiredTarget)
        _dummy.updateMatrix()
        footDesiredMesh.setMatrixAt(i, _dummy.matrix)
      }
      footCurrentMesh.instanceMatrix.needsUpdate = true
      footDesiredMesh.instanceMatrix.needsUpdate = true
    }

    if (toggles.headTarget) {
      const head = chain.joints[0]
      const tgt = targetRef.current
      const pos = headArrowGeom.getAttribute('position') as THREE.BufferAttribute
      const arr = pos.array as Float32Array
      arr[0] = head.x
      arr[1] = head.y
      arr[2] = head.z
      arr[3] = tgt.x
      arr[4] = tgt.y
      arr[5] = tgt.z
      pos.needsUpdate = true
    }
  })

  return null
}
