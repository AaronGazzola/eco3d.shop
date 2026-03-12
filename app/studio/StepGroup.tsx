'use client'

import { useState, useCallback } from 'react'
import { useStudioStore } from './page.stores'
import { BodyGroup, BodyGroupType } from './page.types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

function GroupRow({
  group,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  nested,
}: {
  group: BodyGroup
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  nested?: boolean
}) {
  return (
    <div className={`flex items-center gap-2 py-1 ${nested ? 'ml-4' : ''}`}>
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: group.color }}
      />
      <span className="text-xs text-white/80 flex-1 truncate">{group.name}</span>
      <span className="text-[10px] text-white/30 shrink-0">
        {group.type} · {group.segmentIds.length}
      </span>
      {group.type === 'spine' && (
        <>
          <button
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="text-white/30 hover:text-white/70 disabled:opacity-20 text-xs px-0.5"
          >
            ▲
          </button>
          <button
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="text-white/30 hover:text-white/70 disabled:opacity-20 text-xs px-0.5"
          >
            ▼
          </button>
        </>
      )}
      <button
        onClick={onDelete}
        className="text-white/20 hover:text-red-400 text-xs px-0.5"
      >
        ✕
      </button>
    </div>
  )
}

export function StepGroup() {
  const {
    segments,
    pendingSegmentIds,
    groups,
    clearPending,
    createGroup,
    deleteGroup,
    reorderSpineGroups,
    selectionMode,
    sphere,
    setSelectionMode,
    setSphereRadius,
    selectedNodeGroupId,
    nodeTransformMode,
    setNodeTransformMode,
  } = useStudioStore()

  const [name, setName] = useState('')
  const [type, setType] = useState<BodyGroupType>('spine')
  const [attachedToSpineId, setAttachedToSpineId] = useState<string>('')

  const spineGroups = groups.filter((g) => g.type === 'spine')
  const headGroup = groups.find((g) => g.type === 'head')
  const tailGroup = groups.find((g) => g.type === 'tail')
  const isLeg = type === 'leg-left' || type === 'leg-right'

  function handleCreate() {
    if (!name.trim() || pendingSegmentIds.length === 0) return
    createGroup(name.trim(), type, isLeg && attachedToSpineId ? attachedToSpineId : undefined)
    setName('')
  }

  function moveSpine(id: string, dir: -1 | 1) {
    const ids = spineGroups.map((g) => g.id)
    const idx = ids.indexOf(id)
    if (idx === -1) return
    const next = idx + dir
    if (next < 0 || next >= ids.length) return
    const reordered = [...ids]
    ;[reordered[idx], reordered[next]] = [reordered[next], reordered[idx]]
    reorderSpineGroups(reordered)
  }

  const hasGroups = groups.length > 0

  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(() => {
    const data = groups.map((g) => ({
      name: g.name,
      type: g.type,
      segmentIds: g.segmentIds,
      ...(g.attachedToSpineId ? { attachedToSpineId: g.attachedToSpineId } : {}),
    }))
    navigator.clipboard.writeText(JSON.stringify(data, null, 2)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [groups])

  return (
    <div className="flex flex-col gap-4 p-4 text-white">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">
          Group Segments
        </h3>
        {hasGroups && (
          <button
            onClick={handleCopy}
            className="text-[10px] text-white/30 hover:text-white/70 transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        )}
      </div>

      <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
        <button
          onClick={() => setSelectionMode('click')}
          className={cn(
            'flex-1 py-1 text-xs rounded-md transition-colors',
            selectionMode === 'click' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
          )}
        >
          Click
        </button>
        <button
          onClick={() => setSelectionMode('sphere')}
          className={cn(
            'flex-1 py-1 text-xs rounded-md transition-colors',
            selectionMode === 'sphere' ? 'bg-violet-600/40 text-violet-300' : 'text-white/40 hover:text-white/70'
          )}
        >
          Sphere
        </button>
        <button
          onClick={() => setSelectionMode('node')}
          disabled={!hasGroups}
          className={cn(
            'flex-1 py-1 text-xs rounded-md transition-colors disabled:opacity-25 disabled:pointer-events-none',
            selectionMode === 'node' ? 'bg-amber-600/40 text-amber-300' : 'text-white/40 hover:text-white/70'
          )}
        >
          Node
        </button>
      </div>

      {selectionMode === 'node' && selectedNodeGroupId && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-white/40 uppercase tracking-widest">Transform</span>
          <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
            <button
              onClick={() => setNodeTransformMode('translate')}
              className={cn(
                'flex-1 py-1 text-xs rounded-md transition-colors',
                nodeTransformMode === 'translate' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/70'
              )}
            >
              Move
            </button>
            <button
              onClick={() => setNodeTransformMode('rotate')}
              className={cn(
                'flex-1 py-1 text-xs rounded-md transition-colors',
                nodeTransformMode === 'rotate' ? 'bg-amber-600/40 text-amber-300' : 'text-white/40 hover:text-white/70'
              )}
            >
              Rotate
            </button>
          </div>
        </div>
      )}

      {selectionMode === 'sphere' && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs text-white/50">Radius</span>
            <span className="text-xs text-white/70">{(sphere?.radius ?? 2.0).toFixed(1)}</span>
          </div>
          <input
            type="range"
            min={0.2}
            max={8}
            step={0.1}
            value={sphere?.radius ?? 2.0}
            onChange={(e) => setSphereRadius(parseFloat(e.target.value))}
            className="w-full accent-violet-500"
          />
          {sphere === null && (
            <p className="text-[10px] text-white/30">Click in the scene to place the sphere</p>
          )}
        </div>
      )}

      {pendingSegmentIds.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-white/60">
            Selected ({pendingSegmentIds.length}) components
          </span>
          <button
            onClick={clearPending}
            className="text-[10px] text-white/30 hover:text-white/60"
          >
            Clear
          </button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Group name"
          className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/25"
        />
        <Select value={type} onValueChange={(v) => setType(v as BodyGroupType)}>
          <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="head">Head</SelectItem>
            <SelectItem value="spine">Spine</SelectItem>
            <SelectItem value="tail">Tail</SelectItem>
            <SelectItem value="leg-left">Left Leg</SelectItem>
            <SelectItem value="leg-right">Right Leg</SelectItem>
          </SelectContent>
        </Select>
        {isLeg && spineGroups.length > 0 && (
          <Select value={attachedToSpineId} onValueChange={setAttachedToSpineId}>
            <SelectTrigger className="h-7 text-xs bg-white/5 border-white/10 text-white">
              <SelectValue placeholder="Attach to spine…" />
            </SelectTrigger>
            <SelectContent>
              {spineGroups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          size="sm"
          className="h-7 text-xs"
          disabled={!name.trim() || pendingSegmentIds.length === 0}
          onClick={handleCreate}
        >
          Create Group
        </Button>
      </div>

      {hasGroups && (
        <div className="flex flex-col gap-0.5">
          {headGroup && (
            <GroupRow
              group={headGroup}
              onDelete={() => deleteGroup(headGroup.id)}
            />
          )}
          {spineGroups.map((sg, i) => {
            const attached = groups.filter(
              (g) => (g.type === 'leg-left' || g.type === 'leg-right') && g.attachedToSpineId === sg.id
            )
            return (
              <div key={sg.id}>
                <GroupRow
                  group={sg}
                  onDelete={() => deleteGroup(sg.id)}
                  onMoveUp={() => moveSpine(sg.id, -1)}
                  onMoveDown={() => moveSpine(sg.id, 1)}
                  canMoveUp={i > 0}
                  canMoveDown={i < spineGroups.length - 1}
                />
                {attached.map((leg) => (
                  <GroupRow
                    key={leg.id}
                    group={leg}
                    onDelete={() => deleteGroup(leg.id)}
                    nested
                  />
                ))}
              </div>
            )
          })}
          {groups
            .filter(
              (g) =>
                (g.type === 'leg-left' || g.type === 'leg-right') && !g.attachedToSpineId
            )
            .map((leg) => (
              <GroupRow key={leg.id} group={leg} onDelete={() => deleteGroup(leg.id)} />
            ))}
          {tailGroup && (
            <GroupRow
              group={tailGroup}
              onDelete={() => deleteGroup(tailGroup.id)}
            />
          )}
        </div>
      )}

      {!hasGroups && (
        <p className="text-[10px] text-white/25 text-center py-2">
          Select components in the scene, then create a group.
        </p>
      )}
    </div>
  )
}
