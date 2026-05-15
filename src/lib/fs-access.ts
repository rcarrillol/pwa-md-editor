import { uid } from './tree-ops'
import type { TreeNode, TreeFileNode, TreeFolderNode } from './tree-ops'

type FsHandle = FileSystemFileHandle | FileSystemDirectoryHandle
type FsIterable = { values(): AsyncIterable<FsHandle> }

// Construye subárbol de nodos desde un directorio anclado.
// Devuelve el ID del nodo raíz y todos los nodos generados (con handles vivos).
export async function buildFsSubtree(
  dirHandle: FileSystemDirectoryHandle
): Promise<{ rootId: string; nodes: Record<string, TreeNode> }> {
  const nodes: Record<string, TreeNode> = {}
  const rootId = uid()

  nodes[rootId] = {
    id: rootId, type: 'folder', name: dirHandle.name,
    parentId: '',          // addNode lo sobreescribe
    children: [], open: true,
    dirHandle, fsRoot: true,
  } as TreeFolderNode

  await fillDir(dirHandle, rootId, nodes)
  return { rootId, nodes }
}

async function fillDir(
  dirHandle: FileSystemDirectoryHandle,
  parentId: string,
  nodes: Record<string, TreeNode>
): Promise<void> {
  const entries: FsHandle[] = []
  for await (const entry of (dirHandle as unknown as FsIterable).values()) {
    entries.push(entry)
  }
  entries.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  for (const entry of entries) {
    if (entry.kind === 'file' && /\.(md|markdown|txt)$/i.test(entry.name)) {
      const fileHandle = entry as FileSystemFileHandle
      const file = await fileHandle.getFile()
      const content = await file.text()
      const id = uid()
      nodes[id] = {
        id, type: 'file', name: entry.name, parentId,
        content, createdAt: file.lastModified || Date.now(),
        fileHandle,
      } as TreeFileNode
      ;(nodes[parentId] as TreeFolderNode).children.push(id)
    } else if (entry.kind === 'directory') {
      const subHandle = entry as FileSystemDirectoryHandle
      const id = uid()
      nodes[id] = {
        id, type: 'folder', name: entry.name, parentId,
        children: [], open: false,
        dirHandle: subHandle,
      } as TreeFolderNode
      ;(nodes[parentId] as TreeFolderNode).children.push(id)
      await fillDir(subHandle, id, nodes)
    }
  }
}

// Crea nodos TreeFileNode desde archivos abiertos via <input type=file>.
export async function fileListToNodes(files: FileList): Promise<TreeFileNode[]> {
  const nodes: TreeFileNode[] = []
  for (const file of Array.from(files)) {
    const content = await file.text()
    nodes.push({
      id: uid(), type: 'file', name: file.name,
      parentId: '', content, createdAt: file.lastModified || Date.now(),
    })
  }
  return nodes
}

type ExtendedHandle = FileSystemFileHandle & {
  queryPermission(d: { mode: string }): Promise<PermissionState>
  requestPermission(d: { mode: string }): Promise<PermissionState>
}

// Escribe contenido al disco. Retorna true si tuvo éxito.
export async function saveFileToDisk(
  handle: FileSystemFileHandle,
  content: string
): Promise<boolean> {
  try {
    const h = handle as ExtendedHandle
    let perm = await h.queryPermission({ mode: 'readwrite' })
    if (perm !== 'granted') perm = await h.requestPermission({ mode: 'readwrite' })
    if (perm !== 'granted') return false
    const writable = await handle.createWritable()
    await writable.write(content)
    await writable.close()
    return true
  } catch {
    return false
  }
}
