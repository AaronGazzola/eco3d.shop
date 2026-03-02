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

export interface BodyGroup {
  id: string
  name: string
  segmentIds: string[]
  color: string
  type: BodyGroupType
  attachedToSpineId?: string
}
