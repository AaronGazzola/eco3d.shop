export function detectSegments(positions: Float32Array): Float32Array[] {
  const triCount = positions.length / 9

  const vertexKeyMap = new Map<string, number>()
  let nextId = 0

  function getVertId(triIdx: number, vIdx: number): number {
    const base = (triIdx * 3 + vIdx) * 3
    const k = `${positions[base].toFixed(2)},${positions[base + 1].toFixed(2)},${positions[base + 2].toFixed(2)}`
    let id = vertexKeyMap.get(k)
    if (id === undefined) {
      id = nextId++
      vertexKeyMap.set(k, id)
    }
    return id
  }

  const triVerts = new Array<[number, number, number]>(triCount)
  for (let t = 0; t < triCount; t++) {
    triVerts[t] = [getVertId(t, 0), getVertId(t, 1), getVertId(t, 2)]
  }

  const edgeToTris = new Map<string, number[]>()
  for (let t = 0; t < triCount; t++) {
    const [v0, v1, v2] = triVerts[t]
    const edges = [
      `${Math.min(v0, v1)}_${Math.max(v0, v1)}`,
      `${Math.min(v1, v2)}_${Math.max(v1, v2)}`,
      `${Math.min(v0, v2)}_${Math.max(v0, v2)}`,
    ]
    for (const e of edges) {
      let list = edgeToTris.get(e)
      if (!list) {
        list = []
        edgeToTris.set(e, list)
      }
      list.push(t)
    }
  }

  const visited = new Uint8Array(triCount)
  const components: number[][] = []

  for (let start = 0; start < triCount; start++) {
    if (visited[start]) continue
    const comp: number[] = []
    const stack: number[] = [start]
    visited[start] = 1
    while (stack.length > 0) {
      const curr = stack.pop()!
      comp.push(curr)
      const [v0, v1, v2] = triVerts[curr]
      const edges = [
        `${Math.min(v0, v1)}_${Math.max(v0, v1)}`,
        `${Math.min(v1, v2)}_${Math.max(v1, v2)}`,
        `${Math.min(v0, v2)}_${Math.max(v0, v2)}`,
      ]
      for (const e of edges) {
        const neighbors = edgeToTris.get(e)
        if (!neighbors) continue
        for (const nb of neighbors) {
          if (!visited[nb]) {
            visited[nb] = 1
            stack.push(nb)
          }
        }
      }
    }
    components.push(comp)
  }

  components.sort((a, b) => b.length - a.length)

  return components.map((tris) => {
    const arr = new Float32Array(tris.length * 9)
    for (let i = 0; i < tris.length; i++) {
      arr.set(positions.subarray(tris[i] * 9, tris[i] * 9 + 9), i * 9)
    }
    return arr
  })
}
