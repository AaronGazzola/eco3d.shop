export interface R2FileNode {
  name: string
  key: string
  isFolder: boolean
  children?: R2FileNode[]
}

export interface SegmentData {
  id: string
  positions: Float32Array
  color: string
}

export type BodyGroupType = 'head' | 'spine' | 'tail' | 'leg-left' | 'leg-right'

export interface ModelConfigRow {
  id: string
  stl_key: string
  name: string
  groups: BodyGroup[]
  model_rotation: [number, number, number]
  created_at: string
}

export interface BodyGroup {
  id: string
  name: string
  segmentIds: string[]
  color: string
  type: BodyGroupType
  attachedToSpineId?: string
  nodePosition?: { x: number; z: number }
  nodeAngle?: number
}
