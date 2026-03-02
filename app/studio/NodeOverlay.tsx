'use client'

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useStudioStore } from './page.stores'
import { SegmentData, BodyGroup } from './page.types'

function computeFloorCentroid(segmentIds: string[], segmentMap: Map<string, SegmentData>): THREE.Vector3 {
  let sumX = 0, sumZ = 0, count = 0
  for (const sid of segmentIds) {
    const seg = segmentMap.get(sid)
    if (!seg) continue
    const n = seg.positions.length / 3
    for (let i = 0; i < n; i++) {
      sumX += seg.positions[i * 3]
      sumZ += seg.positions[i * 3 + 2]
      count++
    }
  }
  return count > 0 ? new THREE.Vector3(sumX / count, 0, sumZ / count) : new THREE.Vector3()
}

function disposeObject(obj: THREE.Object3D) {
  if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh || obj instanceof THREE.Line || obj instanceof THREE.LineSegments) {
    obj.geometry?.dispose()
    const mat = obj.material
    if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
    else (mat as THREE.Material)?.dispose()
  }
}

export function NodeOverlay() {
  const containerRef = useRef<THREE.Group>(null)
  const { segments, groups } = useStudioStore()

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const toDispose = [...container.children]
    container.clear()
    toDispose.forEach(disposeObject)

    if (groups.length === 0) return

    const segmentMap = new Map(segments.map((s) => [s.id, s]))
    const centroidMap = new Map<string, THREE.Vector3>()
    for (const g of groups) {
      centroidMap.set(g.id, computeFloorCentroid(g.segmentIds, segmentMap))
    }

    const headGroup = groups.find((g) => g.type === 'head')
    const tailGroup = groups.find((g) => g.type === 'tail')
    const spineGroups = groups.filter((g) => g.type === 'spine')
    const legGroups = groups.filter((g) => g.type === 'leg-left' || g.type === 'leg-right')

    const sphereMat = new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.2 })
    const sphereGeom = new THREE.SphereGeometry(0.15, 10, 10)
    const mesh = new THREE.InstancedMesh(sphereGeom, sphereMat, groups.length)
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    const dummy = new THREE.Object3D()
    groups.forEach((g, i) => {
      dummy.position.copy(centroidMap.get(g.id)!)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, new THREE.Color(g.color))
    })
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    container.add(mesh)

    const spineChain: BodyGroup[] = [
      ...(headGroup ? [headGroup] : []),
      ...spineGroups,
      ...(tailGroup ? [tailGroup] : []),
    ]
    if (spineChain.length >= 2) {
      const points = spineChain.map((g) => centroidMap.get(g.id)!)
      const spineLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points),
        new THREE.LineBasicMaterial({ color: '#ffffff', opacity: 0.6, transparent: true })
      )
      container.add(spineLine)
    }

    const legPairs: THREE.Vector3[] = []
    for (const leg of legGroups) {
      if (!leg.attachedToSpineId) continue
      const legPos = centroidMap.get(leg.id)
      const spinePos = centroidMap.get(leg.attachedToSpineId)
      if (legPos && spinePos) legPairs.push(legPos.clone(), spinePos.clone())
    }
    if (legPairs.length >= 2) {
      container.add(new THREE.LineSegments(
        new THREE.BufferGeometry().setFromPoints(legPairs),
        new THREE.LineBasicMaterial({ color: '#22c55e', opacity: 0.7, transparent: true })
      ))
    }

    return () => {
      const children = [...container.children]
      container.clear()
      children.forEach(disposeObject)
    }
  }, [segments, groups])

  return <group ref={containerRef} />
}
