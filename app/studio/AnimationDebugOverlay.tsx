'use client'

import { useEffect, useRef, MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Chain3D } from '../game/chain3d'
import { LimbState, IntentState } from '../game/useCreature'
import { useStudioStore } from './page.stores'

const MAX_JOINTS = 64
const MAX_LIMBS = 16

const JOINT_COLOR = '#22d3ee'
const BONE_COLOR = '#22d3ee'
const HIP_COLOR = '#f472b6'
const FOOT_COLOR = '#34d399'
const INTENT_COLOR = '#fbbf24'

const JOINT_RADIUS = 0.12
const HIP_RADIUS = 0.14
const FOOT_RADIUS = 0.14
const INTENT_RADIUS = 0.18
const INTENT_ARROW_LENGTH = 1.2

export function AnimationDebugOverlay({
  chainRef,
  limbStatesRef,
  intentRef,
}: {
  chainRef: MutableRefObject<Chain3D | null>
  limbStatesRef: MutableRefObject<LimbState[]>
  intentRef?: MutableRefObject<IntentState | null>
}) {
  const showIntent = useStudioStore((s) => s.overlayToggles.intent)
  const _dummy = useRef(new THREE.Object3D()).current
  const { scene } = useThree()

  const jointsMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const bonesGeomRef = useRef<THREE.BufferGeometry | null>(null)
  const hipsMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const footsMeshRef = useRef<THREE.InstancedMesh | null>(null)
  const intentMeshRef = useRef<THREE.Mesh | null>(null)
  const intentArrowGeomRef = useRef<THREE.BufferGeometry | null>(null)
  const intentArrowLineRef = useRef<THREE.Line | null>(null)

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

    const intentGeom = new THREE.SphereGeometry(INTENT_RADIUS, 12, 10)
    const intentMat = new THREE.MeshBasicMaterial({ color: INTENT_COLOR })
    overlayDepth(intentMat)
    const intentMesh = new THREE.Mesh(intentGeom, intentMat)
    intentMesh.renderOrder = 1000
    intentMesh.raycast = ignoreRaycast
    intentMesh.visible = false
    scene.add(intentMesh)
    intentMeshRef.current = intentMesh

    const arrowGeom = new THREE.BufferGeometry()
    arrowGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3))
    const arrowMat = new THREE.LineBasicMaterial({ color: INTENT_COLOR, linewidth: 2 })
    overlayDepth(arrowMat)
    const arrowLine = new THREE.Line(arrowGeom, arrowMat)
    arrowLine.renderOrder = 1000
    arrowLine.frustumCulled = false
    arrowLine.raycast = ignoreRaycast
    arrowLine.visible = false
    scene.add(arrowLine)
    intentArrowGeomRef.current = arrowGeom
    intentArrowLineRef.current = arrowLine

    return () => {
      scene.remove(jointsMesh)
      scene.remove(bonesLine)
      scene.remove(hipsMesh)
      scene.remove(footsMesh)
      scene.remove(intentMesh)
      scene.remove(arrowLine)
      jointGeom.dispose()
      jointMat.dispose()
      bonesGeom.dispose()
      bonesMat.dispose()
      hipGeom.dispose()
      hipMat.dispose()
      footGeom.dispose()
      footMat.dispose()
      intentGeom.dispose()
      intentMat.dispose()
      arrowGeom.dispose()
      arrowMat.dispose()
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

    const intent = intentRef?.current ?? null
    const intentMesh = intentMeshRef.current
    const arrowLine = intentArrowLineRef.current
    const arrowGeom = intentArrowGeomRef.current
    if (intentMesh && arrowLine) {
      const visible = showIntent && intent !== null
      intentMesh.visible = visible
      arrowLine.visible = visible
      if (visible && intent && arrowGeom) {
        intentMesh.position.copy(intent.position)
        const hx = intent.heading.x
        const hz = intent.heading.z
        const len = Math.hypot(hx, hz) || 1
        const dx = (hx / len) * INTENT_ARROW_LENGTH
        const dz = (hz / len) * INTENT_ARROW_LENGTH
        const pos = arrowGeom.getAttribute('position') as THREE.BufferAttribute
        const arr = pos.array as Float32Array
        arr[0] = intent.position.x
        arr[1] = intent.position.y
        arr[2] = intent.position.z
        arr[3] = intent.position.x + dx
        arr[4] = intent.position.y
        arr[5] = intent.position.z + dz
        pos.needsUpdate = true
      }
    }
  })

  return null
}
