import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { Icon } from './components/Icon'
import { TreeNode } from './components/TreeNode'
import { ContextMenu } from './components/ContextMenu'
import type { ContextMenuState } from './components/ContextMenu'
import { render as mdRender } from './lib/markdown'
import {
  loadState, saveState, uid,
  addNode, removeNode, renameNode, updateContent, toggleFolder, moveNode, duplicateNode,
  pathOf, flatFiles,
} from './lib/tree-ops'
import type { Tree, TreeNode as TNode, TreeFileNode, TreeFolderNode, ViewMode } from './lib/tree-ops'
import { buildFsSubtree, fileListToNodes, saveFileToDisk } from './lib/fs-access'

function resolvePath(dir: string, rel: string): string {
  if (rel.startsWith('/')) return rel;
  const parts = dir === '/' ? [] : dir.split('/').filter(Boolean);
  for (const part of rel.replace(/^\.\//, '').split('/')) {
    if (part === '..') parts.pop();
    else if (part !== '.') parts.push(part);
  }
  return '/' + parts.join('/');
}

declare const __APP_VERSION__: string

const isMac = /Mac|iPod|iPhone|iPad/.test(navigator.platform)
const MOD = isMac ? '⌘' : 'Ctrl'
const mod = (e: KeyboardEvent | React.KeyboardEvent) => isMac ? e.metaKey : e.ctrlKey

type InstallPromptEvent = Event & { prompt(): Promise<void> }

function applyTheme(theme: 'light' | 'dark') {
  document.documentElement.setAttribute('data-theme', theme)
}

// Devuelve true si el nodo ID vive bajo un nodo fsRoot
function isUnderFsRoot(id: string, tree: Tree): boolean {
  let n: TNode | undefined = tree.nodes[id]
  while (n && n.parentId) {
    n = tree.nodes[n.parentId]
    if (n?.type === 'folder' && (n as TreeFolderNode).fsRoot) return true
  }
  return false
}

// Elimina el subárbol fsRoot existente del árbol (si hay uno)
function removeFsSubtree(tree: Tree): Tree {
  const fsRootId = Object.keys(tree.nodes).find(
    id => tree.nodes[id].type === 'folder' && (tree.nodes[id] as TreeFolderNode).fsRoot
  )
  if (!fsRootId) return tree
  return removeNode(tree, fsRootId)
}

export default function App() {
  const initial = useMemo(() => loadState(), [])

  const [tree, setTree] = useState<Tree>(initial.tree)
  const [activeId, setActiveId] = useState<string | null>(initial.activeId)
  const [openTabs, setOpenTabs] = useState<string[]>(initial.openTabs)
  const [viewMode, setViewMode] = useState<ViewMode>(initial.viewMode)
  const [sidebarOpen, setSidebarOpen] = useState(initial.sidebarOpen)
  const [splitRatio, setSplitRatio] = useState(initial.splitRatio)
  const [theme, setTheme] = useState<'light' | 'dark'>(initial.theme)

  const [dirtyFsIds, setDirtyFsIds] = useState(new Set<string>())
  const [dirName, setDirName] = useState<string | null>(null)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)

  const [menu, setMenu] = useState<ContextMenuState | null>(null)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [justCreatedId, setJustCreatedId] = useState<string | null>(null)
  const [dragState, setDragState] = useState<string | null>(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteQuery, setPaletteQuery] = useState('')
  const [paletteSel, setPaletteSel] = useState(0)
  const [toasts, setToasts] = useState<{ id: string; msg: string; icon: string }[]>([])

  const editorRef = useRef<HTMLDivElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const panesRef = useRef<HTMLDivElement>(null)
  const dragGutterRef = useRef(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Tema
  useEffect(() => { applyTheme(theme) }, [theme])

  // Persistir estado
  useEffect(() => {
    saveState({ tree, activeId, openTabs, viewMode, sidebarOpen, splitRatio, theme })
  }, [tree, activeId, openTabs, viewMode, sidebarOpen, splitRatio, theme])

  // Web Share Target — archivos .md compartidos desde Android
  useEffect(() => {
    if (!('caches' in window)) return
    void (async () => {
      try {
        const cache = await caches.open('share-target-v1')
        const res = await cache.match('/pwa-md-editor/__shared-file__')
        if (!res) return
        await cache.delete('/pwa-md-editor/__shared-file__')
        const { name, content } = await res.json() as { name: string; content: string }
        const fileNode: TreeFileNode = {
          id: uid(), type: 'file', name,
          parentId: '', content, createdAt: Date.now(),
        }
        setTree(t => addNode(t, t.root, fileNode))
        setActiveId(fileNode.id)
        setOpenTabs(t => [...t, fileNode.id])
      } catch {}
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as InstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstallPrompt(null))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const activeNode = activeId && tree.nodes[activeId]?.type === 'file'
    ? tree.nodes[activeId] as TreeFileNode
    : null

  const toast = useCallback((msg: string, icon = 'check') => {
    const id = uid()
    setToasts(t => [...t, { id, msg, icon }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 1800)
  }, [])

  const openFile = useCallback((id: string) => {
    setActiveId(id)
    setOpenTabs(t => t.includes(id) ? t : [...t, id])
  }, [])

  const handlePreviewClick = useCallback((e: React.MouseEvent) => {
    const anchor = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null
    if (!anchor) return

    const rel = anchor.getAttribute('data-internal-link')
    if (rel) {
      e.preventDefault()
      if (!activeId) return
      const dir = pathOf(tree, activeId).replace(/\/[^/]+$/, '') || '/'
      const resolved = resolvePath(dir, rel)
      const match = Object.values(tree.nodes).find(n => n.type === 'file' && pathOf(tree, n.id) === resolved)
      if (!match) return
      const hash = anchor.getAttribute('data-internal-hash')
      openFile(match.id)
      if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' }), 80)
      return
    }

    const href = anchor.getAttribute('href')
    if (href?.startsWith('#')) {
      e.preventDefault()
      document.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [tree, activeId, openFile])

  const closeTab = useCallback((id: string) => {
    setOpenTabs(t => {
      const idx = t.indexOf(id)
      const next = t.filter(x => x !== id)
      if (activeId === id) setActiveId(next[idx] ?? next[idx - 1] ?? null)
      return next
    })
  }, [activeId])

  const cycleView = useCallback(() => {
    setViewMode(v => v === 'edit' ? 'split' : v === 'split' ? 'preview' : 'edit')
  }, [])

  // Guarda el archivo activo al disco si tiene fileHandle
  const saveDoc = useCallback(async () => {
    if (!activeNode) return
    if (activeNode.fileHandle) {
      const ok = await saveFileToDisk(activeNode.fileHandle, activeNode.content || '')
      if (!ok) { toast('No se pudo guardar', 'close'); return }
      setDirtyFsIds(s => { const n = new Set(s); n.delete(activeNode.id); return n })
    }
    toast('Guardado', 'save')
  }, [activeNode, toast])

  const handleCreate = useCallback((parentId: string, type: 'file' | 'folder') => {
    const baseName = type === 'folder' ? 'Nueva carpeta' : 'Sin título.md'
    const siblings = (tree.nodes[parentId] as TreeFolderNode)?.children?.map(c => tree.nodes[c]?.name) ?? []
    let name = baseName
    let n = 2
    while (siblings.includes(name)) {
      name = type === 'folder' ? `Nueva carpeta ${n}` : `Sin título ${n}.md`
      n++
    }
    const id = uid()
    const node: TNode = type === 'folder'
      ? { id, type: 'folder', name, parentId, children: [], open: false }
      : { id, type: 'file', name, parentId, content: '', createdAt: Date.now() }
    setTree(t => addNode(t, parentId, node))
    setJustCreatedId(id)
    if (type === 'file') { setActiveId(id); setOpenTabs(t => [...t, id]) }
    toast(`Creado: ${name}`, type === 'folder' ? 'folder' : 'file-md')
  }, [tree, toast])

  const handleDelete = useCallback((id: string) => {
    const node = tree.nodes[id]
    if (!node) return
    const label = node.type === 'folder' ? `carpeta "${node.name}" y todo su contenido` : `"${node.name}"`
    if (!window.confirm(`¿Eliminar ${label}?`)) return
    const toCloseTabs: string[] = []
    const collect = (nid: string) => {
      const n = tree.nodes[nid]; if (!n) return
      if (n.type === 'file') toCloseTabs.push(nid)
      else (n as TreeFolderNode).children.forEach(collect)
    }
    collect(id)
    setTree(t => removeNode(t, id))
    setOpenTabs(t => t.filter(x => !toCloseTabs.includes(x)))
    if (toCloseTabs.includes(activeId!) || id === activeId) {
      const remaining = openTabs.filter(x => !toCloseTabs.includes(x))
      setActiveId(remaining[0] ?? null)
    }
    toast(`Eliminado: ${node.name}`, 'trash')
  }, [tree, activeId, openTabs, toast])

  const handleRename = useCallback((id: string, name: string) => {
    setTree(t => renameNode(t, id, name))
  }, [])

  const handleMove = useCallback((id: string, newParentId: string) => {
    // v1: nodos FS son read-only en estructura
    if (isUnderFsRoot(id, tree)) return
    setTree(t => moveNode(t, id, newParentId))
  }, [tree])

  const handleDuplicate = useCallback((id: string) => {
    setTree(t => duplicateNode(t, id))
    toast('Duplicado')
  }, [toast])

  const handleContextMenu = useCallback((e: React.MouseEvent, node: TNode) => {
    const isFile = node.type === 'file'
    const underFs = isUnderFsRoot(node.id, tree)

    const items = [
      ...(node.type === 'folder' && !underFs ? [
        { label: 'Nuevo archivo', icon: 'new-file' as const, onClick: () => handleCreate(node.id, 'file'), shortcut: `${MOD}N` },
        { label: 'Nueva carpeta', icon: 'new-folder' as const, onClick: () => handleCreate(node.id, 'folder') },
        { sep: true },
      ] : []),
      ...(isFile ? [
        { label: 'Abrir', icon: 'file' as const, onClick: () => openFile(node.id) },
        { label: 'Duplicar', icon: 'copy' as const, onClick: () => handleDuplicate(node.id) },
      ] : []),
      ...(node.id !== tree.root && !underFs ? [
        { label: 'Renombrar', icon: 'rename' as const, onClick: () => setRenamingId(node.id), shortcut: 'F2' },
        { sep: true },
        { label: 'Eliminar', icon: 'trash' as const, onClick: () => handleDelete(node.id), danger: true, shortcut: '⌫' },
      ] : []),
    ]
    if (items.length > 0) setMenu({ x: e.clientX, y: e.clientY, items })
  }, [tree, handleCreate, openFile, handleDuplicate, handleDelete])

  const handleContentChange = useCallback((content: string) => {
    if (!activeId) return
    setTree(t => updateContent(t, activeId, content))
    const node = tree.nodes[activeId] as TreeFileNode
    if (node?.fileHandle) {
      setDirtyFsIds(s => s.has(activeId) ? s : new Set(s).add(activeId))
    }
  }, [activeId, tree])

  const exportCurrent = useCallback(() => {
    if (!activeNode) return
    const blob = new Blob([activeNode.content || ''], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = activeNode.name
    a.click()
    toast('Exportado')
  }, [activeNode, toast])

  // ── File System ──────────────────────────────────────────────────────────

  const openDirectory = useCallback(async () => {
    if (!('showDirectoryPicker' in window)) {
      alert('Tu navegador no soporta la File System Access API.\nUsa Chrome 86+ o Edge.')
      return
    }
    try {
      const dirHandle = await (window as unknown as {
        showDirectoryPicker(o?: { mode: string }): Promise<FileSystemDirectoryHandle>
      }).showDirectoryPicker({ mode: 'readwrite' })

      const { rootId, nodes } = await buildFsSubtree(dirHandle)
      setTree(t => {
        const cleaned = removeFsSubtree(t)
        const merged = { ...cleaned, nodes: { ...cleaned.nodes, ...nodes } }
        const root = merged.nodes[merged.root] as TreeFolderNode
        merged.nodes[merged.root] = {
          ...root,
          children: [rootId, ...root.children.filter(c => !(nodes[c] as TreeFolderNode | undefined)?.fsRoot)],
        }
        nodes[rootId] = { ...nodes[rootId], parentId: merged.root }
        return merged
      })
      setDirName(dirHandle.name)

      // Abrir el primer archivo del directorio
      const firstFile = Object.values(nodes).find(n => n.type === 'file') as TreeFileNode | undefined
      if (firstFile) { setActiveId(firstFile.id); setOpenTabs(t => [...t, firstFile.id]) }
    } catch {
      // usuario canceló
    }
  }, [])

  const unpinDirectory = useCallback(() => {
    setTree(t => {
      const cleaned = removeFsSubtree(t)
      return cleaned
    })
    setDirName(null)
    setDirtyFsIds(new Set())
    setActiveId(id => {
      if (id && tree.nodes[id] && isUnderFsRoot(id, tree)) return null
      return id
    })
    setOpenTabs(t => t.filter(id => !isUnderFsRoot(id, tree)))
  }, [tree])

  const openFilesViaInput = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    const newNodes = await fileListToNodes(files)
    setTree(t => {
      let next = t
      for (const node of newNodes) next = addNode(next, next.root, node)
      return next
    })
    if (newNodes.length > 0) { setActiveId(newNodes[0].id); setOpenTabs(t => [...t, newNodes[0].id]) }
    e.target.value = ''
  }, [])

  const handleInstall = useCallback(async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    setInstallPrompt(null)
  }, [installPrompt])

  // ── Atajos de teclado ────────────────────────────────────────────────────

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (mod(e) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen(o => !o) }
      else if (mod(e) && e.key.toLowerCase() === 'n') { e.preventDefault(); handleCreate(activeNode?.parentId ?? tree.root, 'file') }
      else if (mod(e) && e.key.toLowerCase() === 's') { e.preventDefault(); void saveDoc() }
      else if (mod(e) && e.key.toLowerCase() === 'b') { e.preventDefault(); setSidebarOpen(s => !s) }
      else if (mod(e) && e.key.toLowerCase() === 'p') { e.preventDefault(); cycleView() }
      else if (mod(e) && e.key.toLowerCase() === 'w' && activeId) { e.preventDefault(); closeTab(activeId) }
      else if (e.key === 'F2' && activeId && !paletteOpen) { e.preventDefault(); setRenamingId(activeId) }
      else if (e.key === 'Escape') { setPaletteOpen(false); setMenu(null); setRenamingId(null) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [activeId, activeNode, paletteOpen, tree, handleCreate, cycleView, closeTab, saveDoc])

  // Scroll sincronizado editor → preview
  const handleEditorScroll = useCallback(() => {
    if (viewMode !== 'split' || !editorRef.current || !previewRef.current) return
    const e = editorRef.current
    const p = previewRef.current
    p.scrollTop = (e.scrollTop / Math.max(1, e.scrollHeight - e.clientHeight)) * Math.max(0, p.scrollHeight - p.clientHeight)
  }, [viewMode])

  // Drag del gutter
  useEffect(() => {
    const up = () => { dragGutterRef.current = false; document.body.style.cursor = '' }
    const mv = (e: MouseEvent) => {
      if (!dragGutterRef.current || !panesRef.current) return
      const rect = panesRef.current.getBoundingClientRect()
      setSplitRatio(Math.max(0.2, Math.min(0.8, (e.clientX - rect.left) / rect.width)))
    }
    window.addEventListener('mousemove', mv)
    window.addEventListener('mouseup', up)
    return () => { window.removeEventListener('mousemove', mv); window.removeEventListener('mouseup', up) }
  }, [])

  // ── Command palette ──────────────────────────────────────────────────────

  const paletteItems = useMemo(() => {
    const q = paletteQuery.toLowerCase().trim()
    const match = (s: string) => !q || s.toLowerCase().includes(q)
    const files = flatFiles(tree).map(f => ({
      kind: 'file' as const, id: f.id, label: f.name,
      sub: pathOf(tree, f.id), icon: 'file-md' as const,
      onClick: () => openFile(f.id),
    })).filter(f => match(f.label) || match(f.sub))
    const actions = [
      { kind: 'action' as const, label: 'Nuevo archivo', icon: 'new-file' as const, kbd: `${MOD} N`, onClick: () => handleCreate(activeNode?.parentId ?? tree.root, 'file') },
      { kind: 'action' as const, label: 'Nueva carpeta', icon: 'new-folder' as const, onClick: () => handleCreate(tree.root, 'folder') },
      { kind: 'action' as const, label: 'Abrir directorio', icon: 'folder-open' as const, onClick: openDirectory },
      { kind: 'action' as const, label: 'Mostrar/ocultar sidebar', icon: 'sidebar' as const, kbd: `${MOD} B`, onClick: () => setSidebarOpen(s => !s) },
      { kind: 'action' as const, label: 'Cambiar modo de vista', icon: 'columns' as const, kbd: `${MOD} P`, onClick: cycleView },
      { kind: 'action' as const, label: 'Cambiar tema', icon: 'moon' as const, onClick: () => setTheme(t => t === 'light' ? 'dark' : 'light') },
      { kind: 'action' as const, label: 'Exportar archivo actual', icon: 'download' as const, onClick: exportCurrent },
      ...(activeNode ? [
        { kind: 'action' as const, label: `Renombrar "${activeNode.name}"`, icon: 'rename' as const, kbd: 'F2', onClick: () => setRenamingId(activeId!) },
        { kind: 'action' as const, label: `Eliminar "${activeNode.name}"`, icon: 'trash' as const, onClick: () => handleDelete(activeId!) },
      ] : []),
    ].filter(a => match(a.label))
    return { files, actions }
  }, [paletteQuery, tree, activeId, activeNode, handleCreate, cycleView, exportCurrent, openFile, handleDelete, openDirectory])

  const flatPalette = useMemo(() => [...paletteItems.files, ...paletteItems.actions], [paletteItems])
  useEffect(() => { setPaletteSel(0) }, [paletteQuery, paletteOpen])

  const stats = useMemo(() => {
    if (!activeNode) return null
    const text = activeNode.content || ''
    const words = (text.match(/\S+/g) || []).length
    return { words, chars: text.length, lines: text.split('\n').length, readMins: Math.max(1, Math.round(words / 220)) }
  }, [activeNode])

  const html = useMemo(() => activeNode ? mdRender(activeNode.content || '') : '', [activeNode?.content])
  const rootChildren = (tree.nodes[tree.root] as TreeFolderNode)?.children ?? []
  const activeDirty = activeId ? dirtyFsIds.has(activeId) : false

  // ── JSX ──────────────────────────────────────────────────────────────────

  return (
    <div className="app">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".md,.markdown,.txt"
        multiple
        style={{ display: 'none' }}
        onChange={openFilesViaInput}
      />

      {/* Titlebar */}
      <div className="titlebar">
        <div className="lights">
          <span className="light r" /><span className="light y" /><span className="light g" />
          <span style={{ color: 'var(--ink-3)', fontSize: 11, marginLeft: 10, fontWeight: 500, letterSpacing: '0.02em' }}>
            MD Editor
          </span>
        </div>
        <div className="title-center">
          {activeNode ? (
            <>
              <Icon name="file-md" width={12} height={12} />
              <span>{pathOf(tree, activeId!).replace(/^\//, '')}</span>
              {activeDirty && <span className="dirty-dot" title="Cambios sin guardar" />}
            </>
          ) : (
            <span style={{ opacity: 0.6 }}>Ningún archivo abierto</span>
          )}
        </div>
        <div className="title-right">
          {installPrompt && (
            <button className="icon-btn" onClick={handleInstall} title="Instalar app">
              <Icon name="download" />
            </button>
          )}
          <button
            className={`icon-btn ${sidebarOpen ? 'active' : ''}`}
            onClick={() => setSidebarOpen(s => !s)}
            title={`Mostrar/ocultar sidebar (${MOD}B)`}
          >
            <Icon name="sidebar" />
          </button>
          <button className="icon-btn" onClick={() => setPaletteOpen(true)} title={`Paleta de comandos (${MOD}K)`}>
            <Icon name="command" />
          </button>
          <button
            className={`icon-btn ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            title="Cambiar tema"
          >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className={`body ${sidebarOpen ? '' : 'no-sidebar'}`}>
        <aside className="sidebar">
          <div className="sidebar-head">
            <h3>Archivos</h3>
            <div className="actions">
              <button className="icon-btn" title="Nuevo archivo" onClick={() => handleCreate(tree.root, 'file')}>
                <Icon name="new-file" />
              </button>
              <button className="icon-btn" title="Nueva carpeta" onClick={() => handleCreate(tree.root, 'folder')}>
                <Icon name="new-folder" />
              </button>
              <button className="icon-btn" title="Abrir archivo(s)" onClick={() => fileInputRef.current?.click()}>
                <Icon name="file" />
              </button>
              <button className="icon-btn" title="Abrir directorio" onClick={() => void openDirectory()}>
                <Icon name="folder-open" />
              </button>
            </div>
          </div>
          {dirName && (
            <div className="dir-label">
              <Icon name="folder-open" />
              <span className="dir-label-name" title={dirName}>{dirName}</span>
              <button className="dir-label-unpin" onClick={unpinDirectory} title="Desvincular directorio">×</button>
            </div>
          )}
          <div
            className="tree"
            onContextMenu={(e) => {
              if ((e.target as Element).closest('.tree-row')) return
              e.preventDefault()
              setMenu({ x: e.clientX, y: e.clientY, items: [
                { label: 'Nuevo archivo', icon: 'new-file', onClick: () => handleCreate(tree.root, 'file') },
                { label: 'Nueva carpeta', icon: 'new-folder', onClick: () => handleCreate(tree.root, 'folder') },
              ]})
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData('text/plain')
              if (id) handleMove(id, tree.root)
            }}
          >
            {rootChildren.map(cid => {
              const child = tree.nodes[cid]
              if (!child) return null
              return (
                <TreeNode
                  key={cid}
                  node={child}
                  tree={tree}
                  depth={0}
                  activeId={activeId}
                  onSelect={openFile}
                  onToggle={(id) => setTree(t => toggleFolder(t, id))}
                  onContextMenu={handleContextMenu}
                  onRename={handleRename}
                  renamingId={renamingId}
                  setRenamingId={setRenamingId}
                  onDropMove={handleMove}
                  dragState={dragState}
                  setDragState={setDragState}
                  dirtyIds={dirtyFsIds}
                  justCreatedId={justCreatedId}
                  clearJustCreated={() => setJustCreatedId(null)}
                />
              )
            })}
            {rootChildren.length === 0 && (
              <div className="tree-empty">
                Sin archivos aún.<br />
                Haz clic en <Icon name="new-file" width={11} height={11} style={{ verticalAlign: -1 }} /> para empezar.
              </div>
            )}
          </div>
        </aside>

        <main className="editor-wrap">
          <div className="tabs">
            {openTabs.map(tid => {
              const n = tree.nodes[tid]
              if (!n) return null
              const isDirty = dirtyFsIds.has(tid)
              return (
                <div
                  key={tid}
                  className={`tab ${activeId === tid ? 'active' : ''} ${isDirty ? 'dirty' : ''}`}
                  onClick={() => setActiveId(tid)}
                >
                  <Icon name="file-md" width={11} height={11} style={{ color: 'var(--ink-3)' }} />
                  <span className="t-name">{n.name}</span>
                  <button className="t-close" onClick={(e) => { e.stopPropagation(); closeTab(tid) }}>
                    <Icon name="close" />
                  </button>
                </div>
              )
            })}
            <div className="view-modes">
              <button className={`view-mode-btn ${viewMode === 'edit' ? 'active' : ''}`} onClick={() => setViewMode('edit')}>
                <Icon name="edit" /> Editar
              </button>
              <button className={`view-mode-btn ${viewMode === 'split' ? 'active' : ''}`} onClick={() => setViewMode('split')}>
                <Icon name="columns" /> Dividir
              </button>
              <button className={`view-mode-btn ${viewMode === 'preview' ? 'active' : ''}`} onClick={() => setViewMode('preview')}>
                <Icon name="eye" /> Preview
              </button>
            </div>
          </div>

          {activeNode ? (
            <div
              ref={panesRef}
              className={`panes ${viewMode}`}
              style={viewMode === 'split' ? { gridTemplateColumns: `${splitRatio * 100}% 6px ${(1 - splitRatio) * 100}%` } : undefined}
            >
              {(viewMode === 'edit' || viewMode === 'split') && (
                <div className="editor" ref={editorRef} onScroll={handleEditorScroll}>
                  <div className="editor-inner">
                    <textarea
                      className="textarea"
                      value={activeNode.content || ''}
                      onChange={(e) => handleContentChange(e.target.value)}
                      placeholder={`# ${activeNode.name.replace(/\.md$/, '')}\n\nEmpieza a escribir…`}
                      spellCheck
                    />
                  </div>
                </div>
              )}
              {viewMode === 'split' && (
                <div
                  className="gutter"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    dragGutterRef.current = true
                    document.body.style.cursor = 'col-resize'
                  }}
                />
              )}
              {(viewMode === 'preview' || viewMode === 'split') && (
                <div className="preview" ref={previewRef} onClick={handlePreviewClick}>
                  <div className="preview-inner" dangerouslySetInnerHTML={{ __html: html }} />
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state">
              <div className="logo"><Icon name="book" width={28} height={28} /></div>
              <div>
                <h2>Un lugar tranquilo para escribir</h2>
                <p>Abre un archivo desde la barra lateral o crea uno nuevo. Todo se guarda automáticamente en este navegador.</p>
              </div>
              <div className="shortcuts">
                <kbd>{MOD} N</kbd><span>Nuevo archivo</span>
                <kbd>{MOD} K</kbd><span>Paleta de comandos</span>
                <kbd>{MOD} P</kbd><span>Cambiar modo de vista</span>
                <kbd>{MOD} B</kbd><span>Mostrar/ocultar sidebar</span>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Statusbar */}
      <div className="statusbar">
        <span className="stat">
          <span className="pulse" />
          {activeDirty ? 'Sin guardar' : 'Guardado'}
        </span>
        {activeNode && stats && (
          <>
            <span className="stat">{stats.words} palabras</span>
            <span className="stat">{stats.chars} chars</span>
            <span className="stat">{stats.lines} líneas</span>
            <span className="stat">~{stats.readMins} min</span>
          </>
        )}
        <span className="sep" />
        {activeNode && (
          <button className="stat" onClick={exportCurrent} title="Descargar .md">
            <Icon name="download" /> Exportar
          </button>
        )}
        {activeDirty && (
          <button className="stat" onClick={() => void saveDoc()} title={`Guardar (${MOD}S)`}>
            <Icon name="save" /> Guardar
          </button>
        )}
        <span className="stat">{flatFiles(tree).length} archivos</span>
        <button className="stat" onClick={() => setPaletteOpen(true)}>{MOD}K</button>
        <span className="stat" style={{ opacity: 0.45, fontSize: 10 }}>v{__APP_VERSION__}</span>
      </div>

      {/* Context menu */}
      <ContextMenu menu={menu} onClose={() => setMenu(null)} />

      {/* Command palette */}
      {paletteOpen && (
        <div className="palette-backdrop" onClick={() => setPaletteOpen(false)}>
          <div
            className="palette"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') { setPaletteSel(s => Math.min(flatPalette.length - 1, s + 1)); e.preventDefault() }
              else if (e.key === 'ArrowUp') { setPaletteSel(s => Math.max(0, s - 1)); e.preventDefault() }
              else if (e.key === 'Enter') {
                const item = flatPalette[paletteSel]
                if (item) { item.onClick(); setPaletteOpen(false); setPaletteQuery('') }
              } else if (e.key === 'Escape') { setPaletteOpen(false); setPaletteQuery('') }
            }}
          >
            <div className="palette-input">
              <Icon name="search" />
              <input
                autoFocus
                value={paletteQuery}
                onChange={(e) => setPaletteQuery(e.target.value)}
                placeholder="Buscar archivos o ejecutar un comando…"
              />
              <kbd style={{ fontSize: 10, color: 'var(--ink-4)', fontFamily: 'var(--mono)' }}>esc</kbd>
            </div>
            <div className="palette-list">
              {flatPalette.length === 0 && <div className="p-empty">Sin resultados</div>}
              {paletteItems.files.length > 0 && <div className="p-section">Archivos</div>}
              {paletteItems.files.map((f, i) => (
                <div
                  key={f.id}
                  className={`p-item ${(flatPalette[paletteSel] as {id?: string})?.id === f.id ? 'selected' : ''}`}
                  onMouseEnter={() => setPaletteSel(i)}
                  onClick={() => { f.onClick(); setPaletteOpen(false); setPaletteQuery('') }}
                >
                  <Icon name={f.icon} />
                  <span className="p-label">{f.label}</span>
                  <span className="p-sub">{f.sub}</span>
                </div>
              ))}
              {paletteItems.actions.length > 0 && <div className="p-section">Acciones</div>}
              {paletteItems.actions.map((a, i) => {
                const idx = paletteItems.files.length + i
                return (
                  <div
                    key={a.label}
                    className={`p-item ${idx === paletteSel ? 'selected' : ''}`}
                    onMouseEnter={() => setPaletteSel(idx)}
                    onClick={() => { a.onClick(); setPaletteOpen(false); setPaletteQuery('') }}
                  >
                    <Icon name={a.icon} />
                    <span className="p-label">{a.label}</span>
                    {'kbd' in a && a.kbd && <span className="p-kbd">{a.kbd}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className="toast">
            <Icon name={t.icon as Parameters<typeof Icon>[0]['name']} />
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  )
}
