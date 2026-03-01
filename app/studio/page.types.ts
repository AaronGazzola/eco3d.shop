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
