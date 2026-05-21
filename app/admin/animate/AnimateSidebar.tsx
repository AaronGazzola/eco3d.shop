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

function SimulateTab() {
  const attractor = useAnimateStore((s) => s.attractor)
  const setAttractor = useAnimateStore((s) => s.setAttractor)
  const groups = useSharedStore((s) => s.groups)
  const modelRotation = useSharedStore((s) => s.modelRotation)

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

  return (
    <div className="flex flex-col gap-2 p-4 text-xs text-white/70">
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
