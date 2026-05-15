export interface TreeFileNode {
  id: string
  type: 'file'
  name: string
  parentId: string | null
  content: string
  createdAt: number
  updatedAt?: number
  fileHandle?: FileSystemFileHandle
}

export interface TreeFolderNode {
  id: string
  type: 'folder'
  name: string
  parentId: string | null
  children: string[]
  open: boolean
  dirHandle?: FileSystemDirectoryHandle
  fsRoot?: boolean
}

export type TreeNode = TreeFileNode | TreeFolderNode

export interface Tree {
  root: string
  nodes: Record<string, TreeNode>
}

export type ViewMode = 'edit' | 'split' | 'preview'

export interface PersistedState {
  tree: Tree
  activeId: string | null
  openTabs: string[]
  viewMode: ViewMode
  sidebarOpen: boolean
  splitRatio: number
  theme: 'light' | 'dark'
}

const STORAGE_KEY = 'parchment_v1'
const LEGACY_KEY = 'md-editor-docs'

export const uid = (): string => Math.random().toString(36).slice(2, 10);

const WELCOME = `# Bienvenido

Un lugar tranquilo para tus notas en **markdown**.

## Qué puedes hacer

- Crear, renombrar y eliminar archivos y carpetas
- Arrastrar elementos entre carpetas
- Vista dividida con previsualización en tiempo real
- Presiona \`⌘K\` para la paleta de comandos
- Presiona \`⌘S\` para guardar

> Tus archivos viven en el navegador. Nada sale de tu dispositivo.

### Pruébalo

1. Haz clic en **+** en la barra lateral para crear un archivo
2. Haz clic derecho en cualquier elemento para más opciones
3. Cambia el modo de vista arriba a la derecha

Buena escritura.
`;

export const seedTree = (): Tree => {
  const rootId = 'root';
  const welcomeId = uid();
  return {
    root: rootId,
    nodes: {
      [rootId]: { id: rootId, type: 'folder', name: 'Mi Vault', parentId: null, children: [welcomeId], open: true },
      [welcomeId]: { id: welcomeId, type: 'file', name: 'Bienvenido.md', parentId: rootId, content: WELCOME, createdAt: Date.now() },
    }
  };
};

// Migra Doc[] (clave legacy "md-editor-docs") al árbol. Solo procesa docs locales (sin fileHandle).
export const migrateLegacy = (): Tree | null => {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    const docs: Array<{ id: string; title: string; content: string; path?: string[] }> = JSON.parse(raw);
    if (!Array.isArray(docs) || docs.length === 0) return null;

    const rootId = 'root';
    const nodes: Record<string, TreeNode> = {
      [rootId]: { id: rootId, type: 'folder', name: 'Mi Vault', parentId: null, children: [], open: true },
    };

    // Reutiliza o crea carpetas por nombre dentro de un padre dado
    const ensureFolder = (parentId: string, name: string): string => {
      const parent = nodes[parentId] as TreeFolderNode;
      const existing = parent.children.find(cid => nodes[cid]?.type === 'folder' && nodes[cid].name === name);
      if (existing) return existing;
      const id = uid();
      nodes[id] = { id, type: 'folder', name, parentId, children: [], open: true };
      (nodes[parentId] as TreeFolderNode).children.push(id);
      return id;
    };

    for (const doc of docs) {
      let parentId = rootId;
      for (const segment of doc.path ?? []) {
        parentId = ensureFolder(parentId, segment);
      }
      const name = doc.title.endsWith('.md') ? doc.title : `${doc.title}.md`;
      const fileNode: TreeFileNode = {
        id: doc.id,
        type: 'file',
        name,
        parentId,
        content: doc.content,
        createdAt: Date.now(),
      };
      nodes[doc.id] = fileNode;
      (nodes[parentId] as TreeFolderNode).children.push(doc.id);
    }

    return { root: rootId, nodes };
  } catch {
    return null;
  }
};

const defaultState = (tree: Tree): PersistedState => ({
  tree,
  activeId: null,
  openTabs: [],
  viewMode: 'split',
  sidebarOpen: true,
  splitRatio: 0.5,
  theme: 'light',
})

const sanitizeTree = (tree: Tree): Tree => {
  // Collect all FS node IDs: fsRoot subtree + individual files opened via picker
  const fsIds = new Set<string>()

  const fsRootId = Object.keys(tree.nodes).find(
    id => tree.nodes[id].type === 'folder' && (tree.nodes[id] as TreeFolderNode).fsRoot
  )
  if (fsRootId) {
    const collect = (id: string) => {
      fsIds.add(id)
      const n = tree.nodes[id]
      if (n?.type === 'folder') n.children.forEach(collect)
    }
    collect(fsRootId)
  }
  for (const [id, n] of Object.entries(tree.nodes)) {
    if (n.type === 'file' && (n as TreeFileNode).fileHandle) fsIds.add(id)
  }

  if (fsIds.size === 0) return tree

  // Rebuild without FS nodes, fixing children arrays
  const newNodes: Record<string, TreeNode> = {}
  for (const [id, node] of Object.entries(tree.nodes)) {
    if (fsIds.has(id)) continue
    if (node.type === 'folder') {
      const children = node.children.filter(c => !fsIds.has(c))
      newNodes[id] = children.length === node.children.length ? node : { ...node, children }
    } else {
      newNodes[id] = node
    }
  }
  return { root: tree.root, nodes: newNodes }
}

// Serializa estado completo a localStorage (HB-1: filtra handles FS).
export const saveState = (state: PersistedState): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, tree: sanitizeTree(state.tree) }))
  } catch {}
}

// Carga estado completo. Prioridad: parchment_v1 → migración legacy → seed (HB-2).
export const loadState = (): PersistedState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState
      if (parsed?.tree?.root && parsed?.tree?.nodes) {
        // Filtrar tabs que ya no existen en el árbol
        parsed.openTabs = (parsed.openTabs || []).filter(id => id in parsed.tree.nodes)
        if (parsed.activeId && !(parsed.activeId in parsed.tree.nodes)) parsed.activeId = null
        return parsed
      }
    }
  } catch {}

  const migrated = migrateLegacy()
  if (migrated) {
    const state = defaultState(migrated)
    saveState(state)
    return state
  }

  const state = defaultState(seedTree())
  saveState(state)
  return state
};

export const walk = (tree: Tree, fn: (node: TreeNode, depth: number) => void): void => {
  const visit = (id: string, depth: number) => {
    const n = tree.nodes[id]; if (!n) return;
    fn(n, depth);
    if (n.type === 'folder') n.children.forEach(c => visit(c, depth + 1));
  };
  visit(tree.root, 0);
};

export const addNode = (tree: Tree, parentId: string, node: TreeNode): Tree => {
  const nodes = { ...tree.nodes, [node.id]: { ...node, parentId } };
  const parent = nodes[parentId] as TreeFolderNode;
  nodes[parentId] = { ...parent, children: [...(parent.children || []), node.id], open: true };
  return { ...tree, nodes };
};

export const removeNode = (tree: Tree, id: string): Tree => {
  const nodes = { ...tree.nodes };
  const collectDescendants = (nid: string): string[] => {
    const n = nodes[nid]; if (!n) return [];
    if (n.type === 'file') return [nid];
    return [nid, ...n.children.flatMap(collectDescendants)];
  };
  const toDelete = collectDescendants(id);
  const parentId = nodes[id].parentId;
  if (parentId) {
    const parent = nodes[parentId] as TreeFolderNode;
    nodes[parentId] = { ...parent, children: parent.children.filter(c => c !== id) };
  }
  toDelete.forEach(d => delete nodes[d]);
  return { ...tree, nodes };
};

export const renameNode = (tree: Tree, id: string, name: string): Tree => ({
  ...tree,
  nodes: { ...tree.nodes, [id]: { ...tree.nodes[id], name } }
});

export const updateContent = (tree: Tree, id: string, content: string): Tree => ({
  ...tree,
  nodes: { ...tree.nodes, [id]: { ...tree.nodes[id], content, updatedAt: Date.now() } as TreeNode }
});

export const toggleFolder = (tree: Tree, id: string): Tree => {
  const node = tree.nodes[id] as TreeFolderNode;
  return { ...tree, nodes: { ...tree.nodes, [id]: { ...node, open: !node.open } } };
};

export const moveNode = (tree: Tree, id: string, newParentId: string): Tree => {
  if (id === newParentId) return tree;
  let p: string | null = newParentId;
  while (p) {
    if (p === id) return tree;
    p = tree.nodes[p]?.parentId ?? null;
  }
  const nodes = { ...tree.nodes };
  const oldParentId = nodes[id].parentId;
  if (oldParentId) {
    const oldParent = nodes[oldParentId] as TreeFolderNode;
    nodes[oldParentId] = { ...oldParent, children: oldParent.children.filter(c => c !== id) };
  }
  nodes[id] = { ...nodes[id], parentId: newParentId };
  const newParent = nodes[newParentId] as TreeFolderNode;
  nodes[newParentId] = { ...newParent, children: [...(newParent.children || []), id], open: true };
  return { ...tree, nodes };
};

export const duplicateNode = (tree: Tree, id: string): Tree => {
  const node = tree.nodes[id];
  if (!node || node.type !== 'file') return tree;
  const newNode: TreeFileNode = {
    ...node,
    id: uid(),
    name: node.name.replace(/(\.md)?$/, ' (copia).md').replace('.md (copia).md', ' (copia).md'),
    createdAt: Date.now(),
  };
  return addNode(tree, node.parentId!, newNode);
};

export const pathOf = (tree: Tree, id: string): string => {
  const parts: string[] = [];
  let n: TreeNode | undefined = tree.nodes[id];
  while (n && n.id !== tree.root) { parts.unshift(n.name); n = tree.nodes[n.parentId!]; }
  return '/' + parts.join('/');
};

export const flatFiles = (tree: Tree): TreeFileNode[] => {
  const out: TreeFileNode[] = [];
  walk(tree, (n) => { if (n.type === 'file') out.push(n as TreeFileNode); });
  return out;
};
