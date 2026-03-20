'use client'

import { useState, useCallback, useMemo } from 'react'
import { useStudioStore } from './page.stores'
import { BodyGroup, BodyGroupType, NodeType } from './page.types'
import { useSaveConfig } from './page.hooks'
import { Badge } from '@/components/ui/badge'
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


const GROUP_NODE_TYPES: Partial<Record<BodyGroup['type'], NodeType[]>> = {
  head: ['front', 'back'],
  spine: ['front', 'back'],
  tail: ['front', 'back'],
  'leg-left': ['hip', 'foot'],
  'leg-right': ['hip', 'foot'],
}

function GroupRow({
  group,
  hasSelection,
  onAddSelected,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  nested,
  inNodeMode,
  isNodeSelected,
  onSelectNode,
}: {
  group: BodyGroup
  hasSelection: boolean
  onAddSelected: () => void
  onDelete: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  nested?: boolean
  inNodeMode?: boolean
  isNodeSelected?: (nodeType: NodeType) => boolean
  onSelectNode?: (nodeType: NodeType) => void
}) {
  const nodeTypes = GROUP_NODE_TYPES[group.type] ?? []

  return (
    <div className={nested ? 'ml-4' : ''}>
      <div className="flex items-center gap-2 py-1">
        <div
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: group.color }}
        />
        <span className="text-xs text-white/80 flex-1 truncate">{group.name}</span>
        <span className="text-[10px] text-white/30 shrink-0">
          {group.type} · {group.segmentIds.length}
        </span>
        {hasSelection && (
          <button
            onClick={onAddSelected}
            className="text-[10px] bg-emerald-600/30 hover:bg-emerald-600/60 text-emerald-300 rounded px-1.5 py-0.5 transition-colors shrink-0"
          >
            Add
          </button>
        )}
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
      {inNodeMode && nodeTypes.length > 0 && (
        <div className="flex gap-1 ml-4 mb-1">
          {nodeTypes.map((nt) => {
            const isSelected = isNodeSelected?.(nt) ?? false
            return (
              <Badge
                key={nt}
                variant="outline"
                className={cn(
                  'text-[10px] cursor-pointer transition-colors',
                  isSelected ? 'bg-white text-black border-white' : 'text-white/50 hover:text-white'
                )}
                onClick={() => onSelectNode?.(nt)}
              >
                {nt}
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}

export function StepGroup() {
  const {
    pendingSegmentIds,
    groups,
    stlKey,
    configName,
    setConfigName,
    clearPending,
    createGroup,
    addToGroup,
    deleteGroup,
    reorderSpineGroups,
    selectionMode,
    setSelectionMode,
    selectedNodeId,
    setSelectedNodeId,
  } = useStudioStore()

  const { mutate: saveConfig, isPending: saving } = useSaveConfig()

  const [type, setType] = useState<BodyGroupType>('spine')
  const [attachedToSpineId, setAttachedToSpineId] = useState<string>('')

  const spineGroups = groups.filter((g) => g.type === 'spine')
  const headGroup = groups.find((g) => g.type === 'head')
  const tailGroup = groups.find((g) => g.type === 'tail')
  const isLeg = type === 'leg-left' || type === 'leg-right'

  function handleCreate() {
    if (pendingSegmentIds.length === 0) return
    const sameType = groups.filter((g) => g.type === type).length
    const autoName = sameType > 0 ? `${type}-${sameType + 1}` : type
    createGroup(autoName, type, isLeg && attachedToSpineId ? attachedToSpineId : undefined)
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
  const inNodeMode = selectionMode === 'node'

  const spineChain = useMemo(() => {
    const head = groups.find((g) => g.type === 'head')
    const tail = groups.find((g) => g.type === 'tail')
    const spines = groups.filter((g) => g.type === 'spine')
    return [...(head ? [head] : []), ...spines, ...(tail ? [tail] : [])]
  }, [groups])

  function resolveNodeOwner(groupId: string, nodeType: NodeType): { groupId: string; nodeType: NodeType } {
    if (nodeType === 'front') {
      const idx = spineChain.findIndex((g) => g.id === groupId)
      if (idx > 0) return { groupId: spineChain[idx - 1].id, nodeType: 'back' }
    }
    if (nodeType === 'hip') {
      const legGroup = groups.find((g) => g.id === groupId)
      if (legGroup?.attachedToSpineId) {
        return {
          groupId: legGroup.attachedToSpineId,
          nodeType: legGroup.type === 'leg-left' ? 'hipLeft' : 'hipRight',
        }
      }
    }
    return { groupId, nodeType }
  }

  function isNodeSelected(groupId: string, nodeType: NodeType): boolean {
    if (!selectedNodeId) return false
    const owner = resolveNodeOwner(groupId, nodeType)
    return owner.groupId === selectedNodeId.groupId && owner.nodeType === selectedNodeId.nodeType
  }

  function handleSelectNode(groupId: string, nodeType: NodeType) {
    setSelectedNodeId(resolveNodeOwner(groupId, nodeType))
  }

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
          disabled={pendingSegmentIds.length === 0}
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
              hasSelection={pendingSegmentIds.length > 0}
              onAddSelected={() => addToGroup(headGroup.id)}
              onDelete={() => deleteGroup(headGroup.id)}
              inNodeMode={inNodeMode}
              isNodeSelected={(nt) => isNodeSelected(headGroup.id, nt)}
              onSelectNode={(nt) => handleSelectNode(headGroup.id, nt)}
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
                  hasSelection={pendingSegmentIds.length > 0}
                  onAddSelected={() => addToGroup(sg.id)}
                  onDelete={() => deleteGroup(sg.id)}
                  onMoveUp={() => moveSpine(sg.id, -1)}
                  onMoveDown={() => moveSpine(sg.id, 1)}
                  canMoveUp={i > 0}
                  canMoveDown={i < spineGroups.length - 1}
                  inNodeMode={inNodeMode}
                  isNodeSelected={(nt) => isNodeSelected(sg.id, nt)}
                  onSelectNode={(nt) => handleSelectNode(sg.id, nt)}
                />
                {attached.map((leg) => (
                  <GroupRow
                    key={leg.id}
                    group={leg}
                    hasSelection={pendingSegmentIds.length > 0}
                    onAddSelected={() => addToGroup(leg.id)}
                    onDelete={() => deleteGroup(leg.id)}
                    nested
                    inNodeMode={inNodeMode}
                    isNodeSelected={(nt) => isNodeSelected(leg.id, nt)}
                    onSelectNode={(nt) => handleSelectNode(leg.id, nt)}
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
              <GroupRow
                key={leg.id}
                group={leg}
                hasSelection={pendingSegmentIds.length > 0}
                onAddSelected={() => addToGroup(leg.id)}
                onDelete={() => deleteGroup(leg.id)}
                inNodeMode={inNodeMode}
                isNodeSelected={(nt) => isNodeSelected(leg.id, nt)}
                onSelectNode={(nt) => handleSelectNode(leg.id, nt)}
              />
            ))}
          {tailGroup && (
            <GroupRow
              group={tailGroup}
              hasSelection={pendingSegmentIds.length > 0}
              onAddSelected={() => addToGroup(tailGroup.id)}
              onDelete={() => deleteGroup(tailGroup.id)}
              inNodeMode={inNodeMode}
              isNodeSelected={(nt) => isNodeSelected(tailGroup.id, nt)}
              onSelectNode={(nt) => handleSelectNode(tailGroup.id, nt)}
            />
          )}
        </div>
      )}

      {!hasGroups && (
        <p className="text-[10px] text-white/25 text-center py-2">
          Select components in the scene, then create a group.
        </p>
      )}

      {stlKey && hasGroups && (
        <div className="flex flex-col gap-2 pt-2 border-t border-white/8">
          <Input
            value={configName}
            onChange={(e) => setConfigName(e.target.value)}
            placeholder="Configuration name"
            className="h-7 text-xs bg-white/5 border-white/10 text-white placeholder:text-white/25"
          />
          <Button
            size="sm"
            className="h-7 text-xs"
            disabled={!configName.trim() || saving}
            onClick={() => saveConfig(configName.trim())}
          >
            {saving ? 'Saving…' : 'Save Configuration'}
          </Button>
        </div>
      )}
    </div>
  )
}
