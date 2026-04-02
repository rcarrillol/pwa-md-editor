import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "md-editor-docs";

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }

  .app {
    display: flex;
    height: 100vh;
    height: 100dvh;
    background: #0d0d0d;
    color: #c9d1d9;
    font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
    font-size: 13px;
    overflow: hidden;
  }

  /* SIDEBAR */
  .sidebar {
    width: 220px;
    min-width: 220px;
    background: #111;
    border-right: 1px solid #222;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* slide-in on mobile */
    transition: transform .2s ease;
  }
  .sidebar-header {
    padding: 12px 14px;
    border-bottom: 1px solid #222;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #0d0d0d;
    flex-shrink: 0;
  }
  .sidebar-title {
    color: #58a6ff;
    font-size: 11px;
    letter-spacing: 2px;
    text-transform: uppercase;
    font-weight: 700;
  }
  .btn-new {
    background: #1a1a1a;
    border: 1px solid #333;
    color: #58a6ff;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 14px;
    line-height: 1;
    transition: all .15s;
    font-family: inherit;
  }
  .btn-new:hover { background: #58a6ff22; border-color: #58a6ff; }
  .btn-open {
    background: #1a1a1a;
    border: 1px solid #333;
    color: #8b949e;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 14px;
    line-height: 1;
    transition: all .15s;
    font-family: inherit;
  }
  .btn-open:hover { background: #8b949e22; border-color: #8b949e; color: #c9d1d9; }
  .btn-dir {
    background: #1a1a1a;
    border: 1px solid #333;
    color: #3fb950;
    cursor: pointer;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 13px;
    line-height: 1;
    transition: all .15s;
    font-family: inherit;
  }
  .btn-dir:hover { background: #3fb95022; border-color: #3fb950; }

  .dir-label {
    padding: 5px 14px;
    font-size: 10px;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #3fb950;
    background: #0d1a0f;
    border-bottom: 1px solid #1a2e1a;
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
    min-height: 0;
  }
  .dir-label-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .btn-unpin {
    background: none; border: none;
    color: #3fb95066; cursor: pointer;
    font-size: 14px; padding: 0 2px;
    border-radius: 3px; font-family: inherit;
    transition: color .15s;
    flex-shrink: 0;
  }
  .btn-unpin:hover { color: #f85149; }

  .btn-close-sidebar {
    display: none;
    background: none; border: none;
    color: #555; cursor: pointer;
    font-size: 18px; padding: 4px 6px;
    border-radius: 4px; font-family: inherit;
    min-width: 32px; min-height: 32px;
    align-items: center; justify-content: center;
    transition: all .15s;
  }
  .btn-close-sidebar:hover { color: #c9d1d9; background: #1a1a1a; }
  @media (max-width: 600px) { .btn-close-sidebar { display: flex; } }

  .doc-list {
    flex: 1;
    min-height: 0; /* flex + overflow-y: auto requiere esto para scrollear */
    overflow-y: auto;
    overflow-x: hidden;
    padding: 6px 0;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
  }
  .doc-list::-webkit-scrollbar { width: 4px; }
  .doc-list::-webkit-scrollbar-track { background: transparent; }
  .doc-list::-webkit-scrollbar-thumb { background: #333; border-radius: 2px; }

  .doc-item {
    display: flex;
    align-items: center;
    padding: 10px 14px;
    cursor: pointer;
    gap: 8px;
    border-left: 2px solid transparent;
    transition: all .1s;
    position: relative;
    /* bigger tap target on mobile */
    min-height: 44px;
  }
  .doc-item:hover { background: #1a1a1a; }
  .doc-item.active { background: #161b22; border-left-color: #58a6ff; }
  .doc-item-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 12px;
    color: #c9d1d9;
  }
  .doc-item.active .doc-item-name { color: #58a6ff; }
  .doc-item-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #f0883e;
    flex-shrink: 0;
    opacity: 0;
  }
  .doc-item.unsaved .doc-item-dot { opacity: 1; }
  .btn-del {
    background: none; border: none;
    color: #444; cursor: pointer;
    font-size: 18px; padding: 4px 6px;
    border-radius: 3px;
    transition: all .1s; font-family: inherit;
    /* always visible on touch devices */
    opacity: 0;
    min-width: 32px; min-height: 32px;
    display: flex; align-items: center; justify-content: center;
  }
  .doc-item:hover .btn-del { opacity: 1; }
  @media (hover: none) { .btn-del { opacity: 0.5; } }
  .btn-del:hover { color: #f85149; background: #f8514922; }

  /* MAIN */
  .main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }

  .toolbar {
    padding: 8px 14px;
    background: #0d0d0d;
    border-bottom: 1px solid #222;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  /* hamburger — only on mobile */
  .btn-menu {
    display: none;
    background: none; border: none;
    color: #8b949e; cursor: pointer;
    font-size: 18px; padding: 4px 6px;
    border-radius: 4px; font-family: inherit;
    min-width: 32px; min-height: 32px;
    align-items: center; justify-content: center;
  }
  .btn-menu:hover { color: #c9d1d9; background: #1a1a1a; }

  .doc-title-display {
    flex: 1;
    font-size: 13px;
    color: #8b949e;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .doc-title-display span { color: #c9d1d9; }

  .mode-group {
    display: flex;
    background: #161616;
    border: 1px solid #222;
    border-radius: 5px;
    overflow: hidden;
  }
  .btn-mode {
    background: none; border: none;
    color: #8b949e; cursor: pointer;
    padding: 5px 10px;
    font-size: 11px;
    font-family: inherit;
    letter-spacing: .5px;
    transition: all .15s;
    min-height: 32px;
  }
  .btn-mode:hover { color: #c9d1d9; background: #1f1f1f; }
  .btn-mode.active { background: #58a6ff22; color: #58a6ff; }

  .btn-save {
    background: #1a1a1a;
    border: 1px solid #333;
    color: #3fb950;
    cursor: pointer;
    padding: 5px 12px;
    border-radius: 5px;
    font-size: 11px;
    font-family: inherit;
    letter-spacing: .5px;
    transition: all .15s;
    display: flex; align-items: center; gap: 6px;
    min-height: 32px;
  }
  .btn-save:hover { background: #3fb95022; border-color: #3fb950; }
  .btn-save:disabled { color: #444; border-color: #222; cursor: default; background: #1a1a1a; }
  .save-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #f0883e;
  }

  /* EDITOR AREA */
  .editor-area {
    flex: 1;
    display: flex;
    overflow: hidden;
  }
  .pane {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    min-width: 0;
  }
  .pane + .pane { border-left: 1px solid #222; }
  .pane-label {
    padding: 4px 14px;
    font-size: 10px;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: #444;
    background: #0f0f0f;
    border-bottom: 1px solid #1a1a1a;
    flex-shrink: 0;
  }

  .editor-textarea {
    flex: 1;
    background: #0d0d0d;
    color: #c9d1d9;
    border: none;
    outline: none;
    padding: 20px 24px;
    font-family: inherit;
    font-size: 13px;
    line-height: 1.7;
    resize: none;
    tab-size: 2;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    /* avoid zoom on focus in iOS */
    font-size: max(13px, 16px);
  }
  @media (min-width: 600px) {
    .editor-textarea { font-size: 13px; }
  }
  .editor-textarea::selection { background: #58a6ff33; }
  .editor-textarea::-webkit-scrollbar { width: 6px; }
  .editor-textarea::-webkit-scrollbar-track { background: transparent; }
  .editor-textarea::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }

  .preview-pane {
    flex: 1;
    padding: 20px 28px;
    overflow-y: auto;
    background: #0d0d0d;
    line-height: 1.7;
    -webkit-overflow-scrolling: touch;
  }
  .preview-pane::-webkit-scrollbar { width: 6px; }
  .preview-pane::-webkit-scrollbar-track { background: transparent; }
  .preview-pane::-webkit-scrollbar-thumb { background: #222; border-radius: 3px; }

  /* MD PREVIEW STYLES */
  .preview-pane h1 { font-size: 1.8em; color: #e6edf3; margin: .6em 0 .4em; border-bottom: 1px solid #222; padding-bottom: .3em; }
  .preview-pane h2 { font-size: 1.4em; color: #e6edf3; margin: .8em 0 .3em; border-bottom: 1px solid #1a1a1a; padding-bottom: .2em; }
  .preview-pane h3 { font-size: 1.15em; color: #cdd9e5; margin: .7em 0 .3em; }
  .preview-pane h4, .preview-pane h5, .preview-pane h6 { color: #cdd9e5; margin: .6em 0 .25em; }
  .preview-pane p { margin: .5em 0; }
  .preview-pane strong { color: #e6edf3; font-weight: 700; }
  .preview-pane em { color: #c9d1d9; font-style: italic; }
  .preview-pane code {
    background: #161b22;
    border: 1px solid #222;
    color: #f0883e;
    padding: 1px 6px;
    border-radius: 3px;
    font-size: .92em;
    font-family: inherit;
  }
  .preview-pane pre {
    background: #161b22;
    border: 1px solid #222;
    border-left: 3px solid #58a6ff;
    padding: 14px 18px;
    border-radius: 5px;
    overflow-x: auto;
    margin: .8em 0;
  }
  .preview-pane pre code {
    background: none; border: none; padding: 0;
    color: #a5d6ff; font-size: .9em;
  }
  .preview-pane blockquote {
    border-left: 3px solid #58a6ff;
    background: #161b22;
    padding: 8px 16px;
    margin: .7em 0;
    color: #8b949e;
    border-radius: 0 4px 4px 0;
  }
  .preview-pane ul, .preview-pane ol {
    padding-left: 24px;
    margin: .5em 0;
  }
  .preview-pane li { margin: .2em 0; }
  .preview-pane a { color: #58a6ff; text-decoration: none; }
  .preview-pane a:hover { text-decoration: underline; }
  .preview-pane hr {
    border: none;
    border-top: 1px solid #333;
    margin: 1.2em 0;
  }

  /* EMPTY STATE */
  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 12px;
    color: #444;
  }
  .empty-state-icon { font-size: 36px; opacity: .4; }
  .empty-state-text { font-size: 12px; letter-spacing: 1px; }

  /* MODAL */
  .modal-overlay {
    position: fixed; inset: 0;
    background: #00000088;
    display: flex; align-items: center; justify-content: center;
    z-index: 100;
    backdrop-filter: blur(2px);
    padding: 16px;
  }
  .modal {
    background: #111;
    border: 1px solid #333;
    border-radius: 8px;
    padding: 24px;
    width: 400px;
    max-width: 100%;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
  .modal-title {
    font-size: 13px;
    color: #58a6ff;
    letter-spacing: 1px;
    text-transform: uppercase;
  }
  .modal-field { display: flex; flex-direction: column; gap: 6px; }
  .modal-label { font-size: 10px; color: #8b949e; letter-spacing: 1px; text-transform: uppercase; }
  .modal-input, .modal-textarea {
    background: #0d0d0d;
    border: 1px solid #333;
    border-radius: 4px;
    color: #c9d1d9;
    font-family: inherit;
    font-size: 16px; /* prevent iOS zoom */
    padding: 8px 10px;
    outline: none;
    transition: border-color .15s;
  }
  .modal-input:focus, .modal-textarea:focus { border-color: #58a6ff; }
  .modal-textarea { resize: vertical; min-height: 80px; }
  .modal-actions { display: flex; gap: 8px; justify-content: flex-end; }
  .btn-cancel {
    background: #1a1a1a; border: 1px solid #333;
    color: #8b949e; cursor: pointer;
    padding: 8px 16px; border-radius: 5px;
    font-family: inherit; font-size: 12px;
    transition: all .15s;
    min-height: 36px;
  }
  .btn-cancel:hover { border-color: #444; color: #c9d1d9; }
  .btn-confirm {
    background: #58a6ff22; border: 1px solid #58a6ff;
    color: #58a6ff; cursor: pointer;
    padding: 8px 16px; border-radius: 5px;
    font-family: inherit; font-size: 12px;
    transition: all .15s;
    min-height: 36px;
  }
  .btn-confirm:hover { background: #58a6ff44; }

  /* ── MOBILE overlay sidebar ─────────────────────────── */
  @media (max-width: 600px) {
    .btn-menu { display: flex; }

    .sidebar {
      position: fixed;
      inset: 0 auto 0 0;
      z-index: 50;
      width: 260px;
      transform: translateX(-100%);
      box-shadow: 4px 0 24px #00000099;
    }
    .sidebar.open { transform: translateX(0); }

    .sidebar-backdrop {
      display: block;
      position: fixed;
      inset: 0;
      background: #00000066;
      z-index: 49;
    }

    /* in split mode on mobile, show only editor */
    .editor-area .pane + .pane { display: none; }
  }
  .sidebar-backdrop { display: none; }
`;

// ── Minimal markdown renderer ──────────────────────────────────────────────
function renderMarkdown(md: string): string {
  if (!md) return "";
  const lines = md.split("\n");
  const html: string[] = [];
  let i = 0;

  const inline = (s: string) =>
    s
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/__(.+?)__/g, "<strong>$1</strong>")
      .replace(/_(.+?)_/g, "<em>$1</em>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

  while (i < lines.length) {
    const line = lines[i];

    // fenced code block
    if (/^```/.test(line)) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(lines[i].replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"));
        i++;
      }
      html.push(`<pre><code class="lang-${lang}">${codeLines.join("\n")}</code></pre>`);
      i++;
      continue;
    }

    // headings
    const hm = line.match(/^(#{1,6})\s+(.+)/);
    if (hm) { html.push(`<h${hm[1].length}>${inline(hm[2])}</h${hm[1].length}>`); i++; continue; }

    // hr
    if (/^(---|\*\*\*|___)\s*$/.test(line)) { html.push("<hr>"); i++; continue; }

    // blockquote
    if (/^>\s?/.test(line)) {
      const qLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        qLines.push(inline(lines[i].replace(/^>\s?/, ""))); i++;
      }
      html.push(`<blockquote>${qLines.join("<br>")}</blockquote>`);
      continue;
    }

    // unordered list
    if (/^[\*\-\+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\*\-\+]\s/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^[\*\-\+]\s/, ""))}</li>`); i++;
      }
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    // ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(`<li>${inline(lines[i].replace(/^\d+\.\s/, ""))}</li>`); i++;
      }
      html.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    // blank line
    if (line.trim() === "") { i++; continue; }

    // paragraph
    html.push(`<p>${inline(line)}</p>`);
    i++;
  }

  return html.join("\n");
}

// ── ID generator ──────────────────────────────────────────────────────────
let _id = 0;
const uid = () => `doc_${Date.now()}_${_id++}`;

// ── Default doc ───────────────────────────────────────────────────────────
const DEFAULT_DOC = {
  id: uid(),
  title: "Bienvenido",
  content: `# Bienvenido al editor\n\nEste es un **editor de Markdown** con diseño terminal.\n\n## Características\n\n- Vista previa en tiempo real\n- Modo split, edición y preview\n- Storage persistente entre sesiones\n- Funciona **offline** como PWA\n\n## Ejemplo de código\n\n\`\`\`typescript\nconst greet = (name: string): string => {\n  return \`Hola, \${name}!\`;\n};\n\`\`\`\n\n> _"Any fool can write code that a computer can understand. Good programmers write code that humans can understand."_ — Martin Fowler\n\n---\n\nUsa el panel izquierdo para gestionar tus documentos.`,
};

interface Doc {
  id: string;
  title: string;
  content: string;
  fileHandle?: FileSystemFileHandle; // presente solo en docs respaldados por el FS
}

// ── Main component ─────────────────────────────────────────────────────────
export default function App() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [mode, setMode] = useState<"edit" | "view" | "split">("split");
  const [unsaved, setUnsaved] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dirName, setDirName] = useState<string | null>(null);
  const modalInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const saved: Doc[] | null = raw ? JSON.parse(raw) : null;
      if (saved && Array.isArray(saved) && saved.length > 0) {
        setDocs(saved);
        setActiveId(saved[0].id);
        setDraftContent(saved[0].content);
      } else {
        setDocs([DEFAULT_DOC]);
        setActiveId(DEFAULT_DOC.id);
        setDraftContent(DEFAULT_DOC.content);
      }
    } catch {
      setDocs([DEFAULT_DOC]);
      setActiveId(DEFAULT_DOC.id);
      setDraftContent(DEFAULT_DOC.content);
    }
    setLoaded(true);
  }, []);

  const persist = useCallback((nextDocs: Doc[]) => {
    try {
      // los docs con fileHandle viven en el FS, no en localStorage
      const local = nextDocs.filter(d => !d.fileHandle);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
    } catch {}
  }, []);

  const activeDoc = docs.find(d => d.id === activeId) || null;

  const selectDoc = (doc: Doc) => {
    setActiveId(doc.id);
    setDraftContent(doc.content);
    setUnsaved(false);
    setSidebarOpen(false);
  };

  const handleChange = (val: string) => {
    setDraftContent(val);
    setUnsaved(val !== (activeDoc?.content ?? ""));
  };

  const saveDoc = async () => {
    if (!activeDoc || !unsaved) return;
    if (activeDoc.fileHandle) {
      try {
        const writable = await activeDoc.fileHandle.createWritable();
        await writable.write(draftContent);
        await writable.close();
      } catch {
        return; // permiso denegado u otro error — no marcar como guardado
      }
    }
    const next = docs.map(d => d.id === activeId ? { ...d, content: draftContent } : d);
    setDocs(next);
    setUnsaved(false);
    persist(next);
  };

  const deleteDoc = (id: string) => {
    const next = docs.filter(d => d.id !== id);
    setDocs(next);
    if (activeId === id) {
      const first = next[0] || null;
      setActiveId(first?.id || null);
      setDraftContent(first?.content || "");
      setUnsaved(false);
    }
    persist(next);
  };

  const openDirectory = async () => {
    if (!("showDirectoryPicker" in window)) {
      alert("Tu navegador no soporta la File System Access API.\nUsa Chrome 86+ o Edge.");
      return;
    }
    try {
      const dirHandle = await (window as unknown as {
        showDirectoryPicker(o?: { mode: string }): Promise<FileSystemDirectoryHandle>
      }).showDirectoryPicker({ mode: "readwrite" });

      const newDocs: Doc[] = [];
      for await (const entry of (dirHandle as unknown as AsyncIterable<FileSystemHandle>)) {
        if (entry.kind === "file" && /\.(md|markdown|txt)$/i.test(entry.name)) {
          const fileHandle = entry as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          const content = await file.text();
          const title = entry.name.replace(/\.(md|markdown|txt)$/i, "");
          newDocs.push({ id: uid(), title, content, fileHandle });
        }
      }
      newDocs.sort((a, b) => a.title.localeCompare(b.title));

      setDirName(dirHandle.name);
      setDocs(prev => {
        // reemplaza los docs anteriores del directorio, conserva los locales
        const local = prev.filter(d => !d.fileHandle);
        return [...newDocs, ...local];
      });
      if (newDocs.length > 0) {
        setActiveId(newDocs[0].id);
        setDraftContent(newDocs[0].content);
        setUnsaved(false);
      }
      setSidebarOpen(false);
    } catch {
      // usuario canceló el picker
    }
  };

  const unpinDirectory = () => {
    setDirName(null);
    setDocs(prev => {
      const local = prev.filter(d => !d.fileHandle);
      // si el doc activo era del directorio, seleccionar el primero local
      if (activeId && docs.find(d => d.id === activeId)?.fileHandle) {
        const first = local[0] || null;
        setActiveId(first?.id || null);
        setDraftContent(first?.content || "");
        setUnsaved(false);
      }
      return local;
    });
  };

  const handleFileOpen = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result as string;
        const title = file.name.replace(/\.(md|markdown|txt)$/i, "");
        const doc: Doc = { id: uid(), title, content };
        setDocs(prev => {
          const next = [doc, ...prev];
          persist(next);
          return next;
        });
        setActiveId(doc.id);
        setDraftContent(content);
        setUnsaved(false);
        setSidebarOpen(false);
      };
      reader.readAsText(file);
    });
    // reset so el mismo archivo se puede abrir de nuevo
    e.target.value = "";
  };

  const openModal = () => {
    setNewTitle(""); setNewContent(""); setShowModal(true);
    setTimeout(() => modalInputRef.current?.focus(), 50);
  };
  const closeModal = () => setShowModal(false);

  const createDoc = () => {
    const title = newTitle.trim() || "Sin título";
    const doc: Doc = { id: uid(), title, content: newContent };
    const next = [doc, ...docs];
    setDocs(next);
    setActiveId(doc.id);
    setDraftContent(doc.content);
    setUnsaved(false);
    setShowModal(false);
    setSidebarOpen(false);
    persist(next);
  };

  // Ctrl/Cmd+S to save
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveDoc();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  });

  if (!loaded) return null;

  return (
    <>
      <style>{css}</style>
      <div className="app">
        {/* mobile backdrop */}
        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}

        {/* SIDEBAR */}
        <aside className={`sidebar${sidebarOpen ? " open" : ""}`}>
          <div className="sidebar-header">
            <button className="btn-close-sidebar" onClick={() => setSidebarOpen(false)} title="Cerrar">✕</button>
            <span className="sidebar-title">docs</span>
            <button className="btn-dir" onClick={openDirectory} title="Anclar directorio">⊞</button>
            <button className="btn-open" onClick={() => fileInputRef.current?.click()} title="Abrir archivo .md">↑</button>
            <button className="btn-new" onClick={openModal} title="Nuevo documento">＋</button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".md,.markdown,.txt"
              multiple
              style={{ display: "none" }}
              onChange={handleFileOpen}
            />
          </div>
          {dirName && (
            <div className="dir-label">
              <span>⌂</span>
              <span className="dir-label-name" title={dirName}>{dirName}</span>
              <button className="btn-unpin" onClick={unpinDirectory} title="Desanclar directorio">✕</button>
            </div>
          )}
          <div className="doc-list">
            {docs.length === 0 && (
              <div style={{ padding: "16px", color: "#444", fontSize: "11px", textAlign: "center" }}>
                Sin documentos
              </div>
            )}
            {docs.map(doc => (
              <div
                key={doc.id}
                className={`doc-item${activeId === doc.id ? " active" : ""}${activeId === doc.id && unsaved ? " unsaved" : ""}`}
                onClick={() => selectDoc(doc)}
              >
                <div className="doc-item-dot" />
                <div className="doc-item-name" title={doc.title}>{doc.title}</div>
                <button
                  className="btn-del"
                  title="Eliminar"
                  onClick={e => { e.stopPropagation(); deleteDoc(doc.id); }}
                >×</button>
              </div>
            ))}
          </div>
        </aside>

        {/* MAIN */}
        <div className="main">
          <div className="toolbar">
            <button className="btn-menu" onClick={() => setSidebarOpen(o => !o)} title="Documentos">
              ☰
            </button>
            <div className="doc-title-display">
              {activeDoc
                ? <span>{activeDoc.title}</span>
                : <span style={{color:"#333"}}>ningún documento</span>}
            </div>
            <div className="mode-group">
              {(["edit","split","view"] as const).map(m => (
                <button key={m} className={`btn-mode${mode===m?" active":""}`} onClick={() => setMode(m)}>
                  {m === "edit" ? "editar" : m === "view" ? "ver" : "split"}
                </button>
              ))}
            </div>
            <button className="btn-save" onClick={saveDoc} disabled={!unsaved || !activeDoc}>
              {unsaved && <span className="save-dot" />}
              guardar
            </button>
          </div>

          {!activeDoc ? (
            <div className="editor-area">
              <div className="empty-state">
                <div className="empty-state-icon">⌗</div>
                <div className="empty-state-text">crea o selecciona un documento</div>
              </div>
            </div>
          ) : (
            <div className="editor-area">
              {(mode === "edit" || mode === "split") && (
                <div className="pane">
                  {mode === "split" && <div className="pane-label">markdown</div>}
                  <textarea
                    className="editor-textarea"
                    value={draftContent}
                    onChange={e => handleChange(e.target.value)}
                    spellCheck={false}
                    placeholder="Escribe markdown aquí…"
                  />
                </div>
              )}
              {(mode === "view" || mode === "split") && (
                <div className="pane">
                  {mode === "split" && <div className="pane-label">preview</div>}
                  <div
                    className="preview-pane"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(draftContent) }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* MODAL */}
        {showModal && (
          <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
            <div className="modal">
              <div className="modal-title">nuevo documento</div>
              <div className="modal-field">
                <label className="modal-label">título</label>
                <input
                  ref={modalInputRef}
                  className="modal-input"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Mi documento"
                  onKeyDown={e => e.key === "Enter" && createDoc()}
                />
              </div>
              <div className="modal-field">
                <label className="modal-label">contenido inicial (opcional)</label>
                <textarea
                  className="modal-textarea"
                  value={newContent}
                  onChange={e => setNewContent(e.target.value)}
                  placeholder={"# Título\n\nContenido..."}
                />
              </div>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={closeModal}>cancelar</button>
                <button className="btn-confirm" onClick={createDoc}>crear</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
