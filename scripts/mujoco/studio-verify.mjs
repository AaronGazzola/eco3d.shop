import { spawn } from 'node:child_process'
import http from 'node:http'

const PORT = 3002
const getStatus = (path) =>
  new Promise((res) => {
    const req = http.get(`http://127.0.0.1:${PORT}${path}`, (r) => { r.resume(); res(r.statusCode) })
    req.on('error', () => res(0))
    req.setTimeout(60000, () => { req.destroy(); res(0) })
  })
const okPort = async () => (await getStatus('/')) > 0

console.log('starting next dev on 3002…')
const dev = spawn('npx', ['next', 'dev', '-p', String(PORT)], { shell: true, stdio: ['ignore', 'pipe', 'pipe'] })
let log = ''
dev.stdout.on('data', (d) => (log += d))
dev.stderr.on('data', (d) => (log += d))

function killDev() {
  try { spawn('taskkill', ['/pid', String(dev.pid), '/T', '/F'], { shell: true }) } catch {}
}

let up = false
for (let i = 0; i < 60; i++) {
  if (await okPort()) { up = true; break }
  await new Promise((r) => setTimeout(r, 2000))
}
if (!up) {
  console.log('dev server did not start. log tail:\n' + log.split('\n').slice(-20).join('\n'))
  killDev()
  setTimeout(() => process.exit(1), 1500)
} else {
  console.log('dev up. warming /admin/animate (first compile)…')
  const s1 = await getStatus('/admin/animate')
  console.log(`  /admin/animate → ${s1}`)
  if (s1 >= 500) {
    console.log('animate route errored (my changes may have broken it). log tail:\n' + log.split('\n').slice(-25).join('\n'))
    killDev()
    setTimeout(() => process.exit(1), 1500)
  }
  await new Promise((r) => setTimeout(r, 2000))
  await getStatus('/admin/animate')
  console.log('running observe (mujoco walk, 12s, shots)…')
  const obs = spawn('node', ['scripts/observe.mjs', 'run', '12', '--shots', '--config', 'scripts/mujoco/.walk-mujoco.json'], {
    shell: true,
    stdio: 'inherit',
    env: { ...process.env, OBSERVE_URL: `http://127.0.0.1:${PORT}` },
  })
  obs.on('exit', (code) => {
    console.log('observe exited', code)
    killDev()
    setTimeout(() => process.exit(code ?? 0), 1500)
  })
}
