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

export type NodeType = 'front' | 'back' | 'hipLeft' | 'hipRight' | 'hip' | 'foot'

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
  nodeFront?: { x: number; z: number }
  nodeBack?: { x: number; z: number }
  nodeHipLeft?: { x: number; z: number }
  nodeHipRight?: { x: number; z: number }
  nodeFoot?: { x: number; z: number }
}
