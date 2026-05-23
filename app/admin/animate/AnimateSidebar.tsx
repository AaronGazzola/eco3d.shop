'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { useSharedStore } from '../_lib/sharedStore'
import { useAnimateStore } from './animateStore'
import { CalibrateTab } from './CalibrateTab'
import {
  getLastSnapshot,
  getRecording,
  isRecording,
  startRecording,
  stopRecording,
  clearRecording,
  getFrameCount,
  subscribeDiagnostics,
  FrameSnapshot,
  AxialOscSnapshot,
  LimbOscSnapshot,
} from '@/app/game/locomotion/diagnostics'

async function copyJson(payload: unknown): Promise<boolean> {
  try {
    const text = JSON.stringify(payload, null, 2)
    await navigator.clipboard.writeText(text)
    return true
  } catch (err) {
    console.error(err)
    return false
  }
}

function radToDeg(r: number): string {
  return ((r * 180) / Math.PI).toFixed(1)
}

function wrapTo2Pi(p: number): number {
  const twoPi = 2 * Math.PI
  let x = p % twoPi
  if (x < 0) x += twoPi
  return x
}

function getActiveSnap(): FrameSnapshot | null {
  const playback = useAnimateStore.getState().playback
  if (playback.active) {
    const frames = getRecording()
    if (frames.length === 0) return null
    const idx = Math.min(Math.max(0, playback.frameIndex), frames.length - 1)
    return frames[idx]
  }
  return getLastSnapshot()
}

function DriveSteerReadout({ drive, steer }: { drive: number; steer: number }) {
  const driveBarPct = Math.max(0, Math.min(1, drive)) * 100
  const steerPct = Math.max(-1, Math.min(1, steer)) * 50
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-col gap-0.5">
        <div className="flex justify-between text-[10px] text-white/50">
          <span>drive</span>
          <span className="font-mono text-white/80">{drive.toFixed(3)}</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded bg-white/10">
          <div
            className="h-full bg-emerald-400/70"
            style={{ width: `${driveBarPct}%` }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex justify-between text-[10px] text-white/50">
          <span>steer</span>
          <span className="font-mono text-white/80">{steer.toFixed(3)}</span>
        </div>
        <div className="relative h-1.5 w-full overflow-hidden rounded bg-white/10">
          <div className="absolute inset-y-0 left-1/2 w-px bg-white/30" />
          <div
            className="absolute inset-y-0 bg-amber-400/70"
            style={{
              left: steerPct >= 0 ? '50%' : `${50 + steerPct}%`,
              width: `${Math.abs(steerPct)}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

function OscillatorsTable({ axial }: { axial: AxialOscSnapshot[] }) {
  if (axial.length === 0) {
    return <div className="text-[10px] text-white/30">no axial oscillators</div>
  }
  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-[10px] uppercase tracking-wider text-white/40">
          <th className="text-left font-normal">seg</th>
          <th className="text-right font-normal pr-2">phase°</th>
          <th className="text-right font-normal pr-2">amp</th>
          <th className="text-right font-normal">yaw°</th>
        </tr>
      </thead>
      <tbody>
        {axial.map((o) => (
          <tr key={o.id} className="border-t border-white/5">
            <td className="pr-2 text-white/70">{o.name}</td>
            <td className="pr-2 text-right font-mono text-white/70">
              {radToDeg(wrapTo2Pi(o.phase))}
            </td>
            <td className="pr-2 text-right font-mono text-white/70">
              {o.amplitude.toFixed(3)}
            </td>
            <td className="text-right font-mono text-white/80">
              {radToDeg(o.outputYaw)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function LimbsTable({ limbs }: { limbs: LimbOscSnapshot[] }) {
  if (limbs.length === 0) {
    return <div className="text-[10px] text-white/30">no limb oscillators</div>
  }
  return (
    <table className="w-full text-[11px]">
      <thead>
        <tr className="text-[10px] uppercase tracking-wider text-white/40">
          <th className="text-left font-normal">leg</th>
          <th className="text-right font-normal pr-2">phase°</th>
          <th className="text-right font-normal pr-2">amp</th>
          <th className="text-left font-normal pl-2">stance</th>
        </tr>
      </thead>
      <tbody>
        {limbs.map((l) => {
          const label = `${l.isFront ? 'F' : 'R'}${l.side === 'left' ? 'L' : 'R'}`
          return (
            <tr key={l.id} className="border-t border-white/5">
              <td className="pr-2 text-white/70 font-mono">{label}</td>
              <td className="pr-2 text-right font-mono text-white/70">
                {radToDeg(wrapTo2Pi(l.phase))}
              </td>
              <td className="pr-2 text-right font-mono text-white/70">
                {l.amplitude.toFixed(3)}
              </td>
              <td
                className={cn(
                  'pl-2',
                  l.stanceOrSwing === 'stance' ? 'text-emerald-300' : 'text-amber-300'
                )}
              >
                {l.stanceOrSwing}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function DiagnosticsPanel() {
  const [, force] = useState(0)

  useEffect(() => {
    const id = window.setInterval(() => force((n) => n + 1), 100)
    return () => window.clearInterval(id)
  }, [])

  const snap = getActiveSnap()
  if (!snap) {
    return <div className="text-[11px] text-white/40">no snapshot yet</div>
  }
  return (
    <div className="flex flex-col gap-3">
      <DriveSteerReadout drive={snap.drive} steer={snap.steer} />

      <div className="flex flex-col gap-1">
        <div className="text-[10px] uppercase tracking-wider text-white/40">
          Axial oscillators
        </div>
        <OscillatorsTable axial={snap.axialOscillators} />
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-[10px] uppercase tracking-wider text-white/40">
          Limb oscillators
        </div>
        <LimbsTable limbs={snap.limbOscillators} />
      </div>
    </div>
  )
}

function SimulateTab() {
  const attractor = useAnimateStore((s) => s.attractor)
  const setAttractor = useAnimateStore((s) => s.setAttractor)
  const groups = useSharedStore((s) => s.groups)
  const modelRotation = useSharedStore((s) => s.modelRotation)
  const modelOpacity = useAnimateStore((s) => s.modelOpacity)
  const setModelOpacity = useAnimateStore((s) => s.setModelOpacity)
  const playback = useAnimateStore((s) => s.playback)
  const setPlaybackActive = useAnimateStore((s) => s.setPlaybackActive)
  const setPlaybackPlaying = useAnimateStore((s) => s.setPlaybackPlaying)
  const setPlaybackFrameIndex = useAnimateStore((s) => s.setPlaybackFrameIndex)
  const setFramesPerStep = useAnimateStore((s) => s.setFramesPerStep)
  const solver = useAnimateStore((s) => s.solver)
  const setTimeScale = useAnimateStore((s) => s.setTimeScale)

  const [, force] = useState(0)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const unsub = subscribeDiagnostics(() => force((n) => n + 1))
    return unsub
  }, [])

  useEffect(() => {
    if (!copied) return
    const id = window.setTimeout(() => setCopied(null), 1200)
    return () => window.clearTimeout(id)
  }, [copied])

  const recording = isRecording()
  const frameCount = getFrameCount()
  const clampedFrameIndex =
    frameCount > 0 ? Math.min(Math.max(0, playback.frameIndex), frameCount - 1) : 0

  const onCopySnapshot = async () => {
    const snap = getLastSnapshot()
    const ok = await copyJson({
      kind: 'snapshot',
      capturedAt: new Date().toISOString(),
      config: { groups, modelRotation },
      frame: snap,
    })
    if (ok) setCopied('snapshot')
  }

  const onCopyRecording = async () => {
    const frames = getRecording()
    const ok = await copyJson({
      kind: 'recording',
      capturedAt: new Date().toISOString(),
      frameCount: frames.length,
      config: { groups, modelRotation },
      frames,
    })
    if (ok) setCopied('recording')
  }

  const onCopyCurrentFrame = async () => {
    const frames = getRecording()
    if (frames.length === 0) return
    const frame = frames[clampedFrameIndex]
    const ok = await copyJson({
      kind: 'frame',
      capturedAt: new Date().toISOString(),
      frameIndex: clampedFrameIndex,
      frameCount: frames.length,
      config: { groups, modelRotation },
      frame,
    })
    if (ok) setCopied('frame')
  }

  const stepBy = (delta: number) => {
    if (frameCount === 0) return
    if (playback.playing) setPlaybackPlaying(false)
    const next = Math.min(Math.max(0, clampedFrameIndex + delta), frameCount - 1)
    setPlaybackFrameIndex(next)
  }

  const togglePlayback = () => {
    if (frameCount === 0) return
    if (!playback.active) {
      setPlaybackActive(true)
      setPlaybackFrameIndex(0)
      return
    }
    setPlaybackActive(false)
  }

  const togglePlaying = () => {
    if (!playback.active || frameCount === 0) return
    if (playback.playing) {
      setPlaybackPlaying(false)
    } else {
      if (clampedFrameIndex >= frameCount - 1) setPlaybackFrameIndex(0)
      setPlaybackPlaying(true)
    }
  }

  return (
    <div className="flex flex-col gap-3 p-4 text-xs text-white/70">
      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-[11px] text-white/60">
          <span>Segment opacity</span>
          <span className="font-mono text-white/80">{modelOpacity.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={modelOpacity}
          onChange={(e) => setModelOpacity(parseFloat(e.target.value))}
          className="w-full accent-white/70"
        />
      </div>

      <div className="flex flex-col gap-1 rounded border border-white/15 p-2">
        <div className="flex justify-between text-[11px] text-white/60">
          <span>Time scale</span>
          <span className="font-mono text-white/80">
            {solver.timeScale.toFixed(2)}x
          </span>
        </div>
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={solver.timeScale}
          onChange={(e) => setTimeScale(parseFloat(e.target.value))}
          className="w-full accent-white/70"
        />
        <div className="flex gap-1">
          {[0.1, 0.25, 0.5, 1].map((v) => (
            <button
              key={v}
              onClick={() => setTimeScale(v)}
              className={cn(
                'flex-1 rounded border px-1 py-0.5 text-[10px]',
                Math.abs(solver.timeScale - v) < 0.01
                  ? 'border-white/40 text-white/90'
                  : 'border-white/15 text-white/50 hover:bg-white/10'
              )}
            >
              {v}x
            </button>
          ))}
        </div>
      </div>

      <div className="rounded border border-white/15 p-2">
        <DiagnosticsPanel />
      </div>

      <button
        onClick={() => setAttractor(null)}
        disabled={!attractor}
        className={cn(
          'rounded border border-white/20 px-2 py-1.5 text-[11px] text-left',
          attractor ? 'text-white/80 hover:bg-white/10' : 'text-white/30'
        )}
      >
        Clear attractor
      </button>

      <button
        onClick={onCopySnapshot}
        className="rounded border border-white/20 px-2 py-1.5 text-[11px] text-left text-white/80 hover:bg-white/10"
      >
        {copied === 'snapshot' ? 'Copied snapshot ✓' : 'Copy snapshot (current frame)'}
      </button>

      <button
        onClick={() => (recording ? stopRecording() : startRecording())}
        className={cn(
          'rounded border px-2 py-1.5 text-[11px] text-left',
          recording
            ? 'border-red-400/60 text-red-200 hover:bg-red-500/10'
            : 'border-white/20 text-white/80 hover:bg-white/10'
        )}
      >
        {recording ? `Stop recording (${frameCount} frames)` : 'Start recording'}
      </button>

      <button
        onClick={onCopyRecording}
        disabled={frameCount === 0}
        className={cn(
          'rounded border border-white/20 px-2 py-1.5 text-[11px] text-left',
          frameCount > 0 ? 'text-white/80 hover:bg-white/10' : 'text-white/30'
        )}
      >
        {copied === 'recording'
          ? 'Copied recording ✓'
          : `Copy recording${frameCount > 0 ? ` (${frameCount} frames)` : ''}`}
      </button>

      <button
        onClick={() => clearRecording()}
        disabled={frameCount === 0}
        className={cn(
          'rounded border border-white/20 px-2 py-1.5 text-[11px] text-left',
          frameCount > 0 ? 'text-white/60 hover:bg-white/10' : 'text-white/30'
        )}
      >
        Clear recording buffer
      </button>

      <div className="mt-1 flex flex-col gap-2 rounded border border-white/15 p-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-white/50">Playback</span>
          <button
            onClick={togglePlayback}
            disabled={frameCount === 0}
            className={cn(
              'rounded border px-2 py-0.5 text-[10px]',
              frameCount === 0
                ? 'border-white/10 text-white/30'
                : playback.active
                  ? 'border-amber-400/60 text-amber-200 hover:bg-amber-500/10'
                  : 'border-white/20 text-white/80 hover:bg-white/10'
            )}
          >
            {playback.active ? 'Exit playback' : 'Enter playback'}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={togglePlaying}
            disabled={!playback.active || frameCount === 0}
            className={cn(
              'rounded border px-2 py-1 text-[11px]',
              !playback.active || frameCount === 0
                ? 'border-white/10 text-white/30'
                : playback.playing
                  ? 'border-amber-400/60 text-amber-200 hover:bg-amber-500/10'
                  : 'border-white/20 text-white/80 hover:bg-white/10'
            )}
          >
            {playback.playing ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={() => stepBy(-playback.framesPerStep)}
            disabled={!playback.active || frameCount === 0 || clampedFrameIndex === 0}
            className={cn(
              'rounded border px-2 py-1 text-[11px]',
              !playback.active || frameCount === 0 || clampedFrameIndex === 0
                ? 'border-white/10 text-white/30'
                : 'border-white/20 text-white/80 hover:bg-white/10'
            )}
            title={`Step back ${playback.framesPerStep} frame(s)`}
          >
            ◀ −{playback.framesPerStep}
          </button>
          <button
            onClick={() => stepBy(playback.framesPerStep)}
            disabled={
              !playback.active || frameCount === 0 || clampedFrameIndex >= frameCount - 1
            }
            className={cn(
              'rounded border px-2 py-1 text-[11px]',
              !playback.active || frameCount === 0 || clampedFrameIndex >= frameCount - 1
                ? 'border-white/10 text-white/30'
                : 'border-white/20 text-white/80 hover:bg-white/10'
            )}
            title={`Step forward ${playback.framesPerStep} frame(s)`}
          >
            +{playback.framesPerStep} ▶
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex justify-between text-[11px] text-white/60">
            <span>Frame</span>
            <span className="font-mono text-white/80">
              {frameCount > 0 ? `${clampedFrameIndex} / ${frameCount - 1}` : '—'}
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={Math.max(0, frameCount - 1)}
            step={1}
            value={clampedFrameIndex}
            disabled={!playback.active || frameCount === 0}
            onChange={(e) => {
              if (playback.playing) setPlaybackPlaying(false)
              setPlaybackFrameIndex(parseInt(e.target.value, 10))
            }}
            className="w-full accent-white/70"
          />
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-[11px] text-white/60">
            <span>Frames per step</span>
            <input
              type="number"
              min={1}
              max={Math.max(1, frameCount || 1)}
              step={1}
              value={playback.framesPerStep}
              onChange={(e) => setFramesPerStep(parseInt(e.target.value, 10) || 1)}
              className="w-16 rounded border border-white/15 bg-transparent px-1.5 py-0.5 text-right font-mono text-white/80"
            />
          </div>
          <input
            type="range"
            min={1}
            max={Math.max(1, Math.min(100, frameCount || 1))}
            step={1}
            value={Math.min(playback.framesPerStep, Math.max(1, frameCount || 1))}
            onChange={(e) => setFramesPerStep(parseInt(e.target.value, 10))}
            className="w-full accent-white/70"
          />
        </div>

        <button
          onClick={onCopyCurrentFrame}
          disabled={!playback.active || frameCount === 0}
          className={cn(
            'rounded border px-2 py-1.5 text-[11px] text-left',
            !playback.active || frameCount === 0
              ? 'border-white/10 text-white/30'
              : 'border-white/20 text-white/80 hover:bg-white/10'
          )}
        >
          {copied === 'frame'
            ? 'Copied frame ✓'
            : `Copy current frame${playback.active && frameCount > 0 ? ` (#${clampedFrameIndex})` : ''}`}
        </button>
      </div>
    </div>
  )
}

export function AnimateSidebar() {
  const activeTab = useAnimateStore((s) => s.animateTab)
  const setAnimateTab = useAnimateStore((s) => s.setAnimateTab)

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-3">
        <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
          <button
            onClick={() => setAnimateTab('simulate')}
            className={cn(
              'flex-1 py-1 text-xs rounded-md transition-colors',
              activeTab === 'simulate'
                ? 'bg-white/15 text-white'
                : 'text-white/40 hover:text-white/70'
            )}
          >
            Simulate
          </button>
          <button
            onClick={() => setAnimateTab('calibrate')}
            className={cn(
              'flex-1 py-1 text-xs rounded-md transition-colors',
              activeTab === 'calibrate'
                ? 'bg-amber-600/40 text-amber-300'
                : 'text-white/40 hover:text-white/70'
            )}
          >
            Calibrate
          </button>
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {activeTab === 'simulate' ? (
          <div className="h-full overflow-y-auto">
            <SimulateTab />
          </div>
        ) : (
          <CalibrateTab />
        )}
      </div>
    </div>
  )
}
