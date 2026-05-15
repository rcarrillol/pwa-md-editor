import { useState, useEffect, useRef } from 'react'
import { Icon } from './Icon'
import type { Tree, TreeNode as TNode, TreeFolderNode, TreeFileNode } from '../lib/tree-ops'

interface Props {
  node: TNode
  tree: Tree
  depth: number
  activeId: string | null
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  onContextMenu: (e: React.MouseEvent, node: TNode) => void
  onRename: (id: string, name: string) => void
  renamingId: string | null
  setRenamingId: (id: string | null) => void
  onDropMove: (id: string, parentId: string) => void
  dragState: string | null
  setDragState: (id: string | null) => void
  dirtyIds: Set<string>
  justCreatedId: string | null
  clearJustCreated: () => void
}

export function TreeNode({
  node, tree, depth, activeId, onSelect, onToggle, onContextMenu,
  onRename, renamingId, setRenamingId, onDropMove,
  dragState, setDragState, dirtyIds, justCreatedId, clearJustCreated,
}: Props) {
  const isFolder = node.type === 'folder'
  const isActive = activeId === node.id && !isFolder
  const isRenaming = renamingId === node.id
  const isOpen = isFolder && (node as TreeFolderNode).open
  const [renameValue, setRenameValue] = useState(node.name)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      const dot = node.name.lastIndexOf('.')
      inputRef.current.setSelectionRange(0, dot > 0 ? dot : node.name.length)
      setRenameValue(node.name)
    }
  }, [isRenaming, node.name])

  useEffect(() => {
    if (justCreatedId === node.id) {
      setRenamingId(node.id)
      clearJustCreated()
    }
  }, [justCreatedId, node.id, setRenamingId, clearJustCreated])

  const commitRename = () => {
    const v = renameValue.trim()
    if (v && v !== node.name) onRename(node.id, v)
    setRenamingId(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const draggedId = e.dataTransfer.getData('text/plain')
    if (!draggedId || draggedId === node.id) { setDragState(null); return }
    const target = isFolder ? node.id : (node.parentId ?? tree.root)
    onDropMove(draggedId, target)
    setDragState(null)
  }

  const rowClass = [
    'tree-row',
    isActive ? 'active' : '',
    isOpen ? 'open' : '',
    dragState === node.id ? 'dragover' : '',
    dirtyIds.has(node.id) ? 'dirty' : '',
  ].filter(Boolean).join(' ')

  return (
    <div className="tree-node">
      <div
        className={rowClass}
        onClick={() => {
          if (isRenaming) return
          if (isFolder) onToggle(node.id)
          else onSelect(node.id)
        }}
        onDoubleClick={(e) => { e.stopPropagation(); setRenamingId(node.id) }}
        onContextMenu={(e) => { e.preventDefault(); onContextMenu(e, node) }}
        draggable={!isRenaming && node.id !== tree.root}
        onDragStart={(e) => { e.dataTransfer.setData('text/plain', node.id); e.dataTransfer.effectAllowed = 'move' }}
        onDragOver={(e) => { if (isFolder) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragState(node.id) } }}
        onDragLeave={() => { if (dragState === node.id) setDragState(null) }}
        onDrop={handleDrop}
      >
        {isFolder
          ? <Icon name="chev-right" className="chev" />
          : <span className="chev" style={{ opacity: 0, width: 12, height: 12, display: 'inline-block' }} />}
        <Icon name={isFolder ? (isOpen ? 'folder-open' : 'folder') : 'file-md'} className="ico" />
        {isRenaming ? (
          <input
            ref={inputRef}
            className="rename"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename()
              else if (e.key === 'Escape') setRenamingId(null)
              e.stopPropagation()
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <>
            <span className="name">{node.name}</span>
            <span className="dot" />
          </>
        )}
      </div>
      {isFolder && isOpen && (
        <div className="tree-children">
          {((node as TreeFolderNode).children || []).map(cid => {
            const child = tree.nodes[cid]
            if (!child) return null
            return (
              <TreeNode
                key={cid}
                node={child}
                tree={tree}
                depth={depth + 1}
                activeId={activeId}
                onSelect={onSelect}
                onToggle={onToggle}
                onContextMenu={onContextMenu}
                onRename={onRename}
                renamingId={renamingId}
                setRenamingId={setRenamingId}
                onDropMove={onDropMove}
                dragState={dragState}
                setDragState={setDragState}
                dirtyIds={dirtyIds}
                justCreatedId={justCreatedId}
                clearJustCreated={clearJustCreated}
              />
            )
          })}
          {(node as TreeFolderNode).children?.length === 0 && depth > 0 && (
            <div style={{ padding: '2px 8px', fontSize: 11, color: 'var(--ink-4)', fontStyle: 'italic' }}>vacío</div>
          )}
        </div>
      )}
    </div>
  )
}

// Re-export types needed by consumers
export type { TreeFileNode, TreeFolderNode }
