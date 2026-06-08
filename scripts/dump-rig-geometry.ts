import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl, getSupabaseSecretKey } from '@/lib/env.utils'

interface Node { x: number; y?: number; z: number }
interface Group {
  id: string; name: string; type: string
  nodeFront?: Node; nodeBack?: Node
  nodeHipLeft?: Node; nodeHipRight?: Node
  attachedToSpineId?: string
  angleCaps?: { yaw?: number; yawBack?: number; pitchUp?: number; pitchDown?: number }
}

async function main() {
  const supabase = createClient(getSupabaseUrl(), getSupabaseSecretKey())
  const { data, error } = await supabase
    .from('model_configs')
    .select('name, groups')
    .ilike('name', '%baby cyber dragon%')
  if (error) throw error
  if (!data || data.length === 0) throw new Error('no matching rig')
  for (const cfg of data) {
    const groups = cfg.groups as Group[]
    console.log(`\n=== ${cfg.name} (${groups.length} groups) ===`)
    const spineYs: number[] = []
    for (const g of groups) {
      if (g.type === 'head' || g.type === 'spine' || g.type === 'tail') {
        if (g.nodeBack?.y != null) spineYs.push(g.nodeBack.y)
        if (g.nodeFront?.y != null) spineYs.push(g.nodeFront.y)
      }
    }
    console.log(`spine/head/tail node Y: min=${Math.min(...spineYs).toFixed(3)} max=${Math.max(...spineYs).toFixed(3)}`)
    console.log('\nSPINE CHAIN (id, type, nodeBack, hip sockets):')
    for (const g of groups) {
      if (g.type !== 'head' && g.type !== 'spine' && g.type !== 'tail') continue
      const nb = g.nodeBack, nf = g.nodeFront
      let s = `  ${g.id.slice(0, 8).padEnd(9)} ${g.type.padEnd(6)}`
      if (nf) s += ` front=(${nf.x?.toFixed(2)},${(nf.y ?? 0).toFixed(2)},${nf.z?.toFixed(2)})`
      if (nb) s += ` back=(${nb.x?.toFixed(2)},${(nb.y ?? 0).toFixed(2)},${nb.z?.toFixed(2)})`
      if (g.nodeHipLeft) s += `  HIPL=(${g.nodeHipLeft.x?.toFixed(2)},${(g.nodeHipLeft.y ?? 0).toFixed(2)},${g.nodeHipLeft.z?.toFixed(2)})`
      if (g.nodeHipRight) s += `  HIPR=(${g.nodeHipRight.x?.toFixed(2)},${(g.nodeHipRight.y ?? 0).toFixed(2)},${g.nodeHipRight.z?.toFixed(2)})`
      console.log(s)
    }
    console.log('\nLEGS — hip socket (from parent spine) → nodeFoot:')
    const byId = new Map(groups.map((g) => [g.id, g]))
    for (const g of groups) {
      if (g.type !== 'leg-left' && g.type !== 'leg-right') continue
      const foot = (g as { nodeFoot?: Node }).nodeFoot
      const parent = g.attachedToSpineId ? byId.get(g.attachedToSpineId) : undefined
      const hip = g.type === 'leg-left' ? parent?.nodeHipLeft : parent?.nodeHipRight
      let line = `  ${g.name.padEnd(13)} attachedTo=${g.attachedToSpineId}`
      if (hip) line += `  hip=(${hip.x?.toFixed(2)},${(hip.y ?? 0).toFixed(2)},${hip.z?.toFixed(2)})`
      if (foot) line += `  foot=(${foot.x?.toFixed(2)},${(foot.y ?? 0).toFixed(2)},${foot.z?.toFixed(2)})`
      if (hip && foot) {
        const dy = (foot.y ?? 0) - (hip.y ?? 0)
        const len = Math.hypot((foot.x ?? 0) - (hip.x ?? 0), (foot.y ?? 0) - (hip.y ?? 0), (foot.z ?? 0) - (hip.z ?? 0))
        line += `  Δy=${dy.toFixed(2)} len=${len.toFixed(2)}`
      }
      console.log(line)
    }
    console.log('\nLEGS (hip = nodeFront, foot = nodeBack):')
    for (const g of groups) {
      if (g.type !== 'leg-left' && g.type !== 'leg-right') continue
      const hip = g.nodeFront, foot = g.nodeBack
      const dy = (foot?.y ?? 0) - (hip?.y ?? 0)
      console.log(
        `  ${g.type.padEnd(9)} ${g.name.padEnd(14)} hip=(${hip?.x.toFixed(2)},${(hip?.y ?? 0).toFixed(2)},${hip?.z.toFixed(2)}) ` +
        `foot=(${foot?.x.toFixed(2)},${(foot?.y ?? 0).toFixed(2)},${foot?.z.toFixed(2)})  footΔy=${dy.toFixed(2)}  caps=${JSON.stringify(g.angleCaps)}`
      )
    }
  }
}

main().then(() => process.exit(0))
