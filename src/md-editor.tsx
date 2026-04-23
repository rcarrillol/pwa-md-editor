import { useState, useEffect, useCallback, useRef } from "react";

const STORAGE_KEY = "md-editor-docs";

const css = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }

  .app {
    display: flex;
    height: 100vh;
    height: 100dvh;
    background: #141414;
    color: #c9d1d9;
    font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
    font-size: 13px;
    overflow: hidden;
  }

  /* SIDEBAR */
  .sidebar {
    width: 220px;
    min-width: 220px;
    background: #181818;
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
    background: #141414;
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
    background: #222;
    border: 1px solid #3a3a3a;
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
    background: #222;
    border: 1px solid #3a3a3a;
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
    background: #222;
    border: 1px solid #3a3a3a;
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
    color: #3fb950bb; cursor: pointer;
    font-size: 14px; padding: 0 4px;
    border-radius: 3px; font-family: inherit;
    transition: all .15s;
    flex-shrink: 0;
    min-width: 24px; min-height: 24px;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .btn-unpin:hover { color: #f85149; background: #f8514922; }

  /* FOLDER TREE */
  .folder-row {
    display: flex;
    align-items: center;
    padding: 5px 14px;
    gap: 6px;
    cursor: pointer;
    min-height: 30px;
    user-select: none;
    transition: background .1s;
  }
  .folder-row:hover { background: #1a1a1a; }
  .folder-chevron {
    color: #7d8590;
    font-size: 9px;
    width: 10px;
    flex-shrink: 0;
    display: inline-block;
    transition: transform .15s;
  }
  .folder-icon { color: #e3b341; font-size: 12px; flex-shrink: 0; }
  .folder-name {
    color: #c9d1d9;
    font-size: 11px;
    letter-spacing: .5px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .folder-row:hover .folder-name { color: #e6edf3; }
  .tree-section { margin-bottom: 4px; }

  .btn-close-sidebar {
    display: none;
    background: #1a1a1a; border: 1px solid #2a2a2a;
    color: #c9d1d9; cursor: pointer;
    font-size: 16px; padding: 4px 6px;
    border-radius: 4px; font-family: inherit;
    min-width: 32px; min-height: 32px;
    align-items: center; justify-content: center;
    transition: all .15s;
  }
  .btn-close-sidebar:hover { color: #f85149; border-color: #f8514955; background: #f8514922; }
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
    background: #1a1a1a; border: 1px solid #2a2a2a;
    color: #8b949e; cursor: pointer;
    font-size: 16px; padding: 2px 6px;
    border-radius: 4px;
    transition: all .1s; font-family: inherit;
    opacity: .55;
    min-width: 28px; min-height: 28px;
    display: flex; align-items: center; justify-content: center;
    line-height: 1;
  }
  .doc-item:hover .btn-del { opacity: 1; }
  @media (hover: none) { .btn-del { opacity: .8; } }
  .btn-del:hover { color: #f85149; background: #f8514922; border-color: #f8514955; }

  /* row actions (rename / new file / new folder) */
  .btn-row-act {
    background: #1a1a1a; border: 1px solid #2a2a2a;
    color: #b1bac4; cursor: pointer;
    font-size: 13px; padding: 2px 5px;
    border-radius: 4px;
    transition: all .1s; font-family: inherit;
    opacity: .65;
    min-width: 26px; min-height: 28px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    line-height: 1;
  }
  .doc-item:hover .btn-row-act,
  .folder-row:hover .btn-row-act,
  .dir-label:hover .btn-row-act { opacity: 1; }
  @media (hover: none) { .btn-row-act { opacity: .85; } }
  .btn-row-act:hover { color: #58a6ff; background: #58a6ff22; border-color: #58a6ff77; }
  .dir-label .btn-row-act { color: #3fb950cc; border-color: #1a2e1a; background: #0d1a0f; }
  .dir-label .btn-row-act:hover { color: #3fb950; background: #3fb95022; border-color: #3fb95077; }

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
    background: #141414;
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
  .btn-install {
    background: #1a1a1a;
    border: 1px solid #58a6ff66;
    color: #58a6ff;
    cursor: pointer;
    padding: 5px 10px;
    border-radius: 5px;
    font-size: 11px;
    font-family: inherit;
    letter-spacing: .5px;
    transition: all .15s;
    display: flex; align-items: center; gap: 5px;
    min-height: 32px;
    animation: pulse-border 2s infinite;
  }
  .btn-install:hover { background: #58a6ff22; border-color: #58a6ff; }
  @keyframes pulse-border {
    0%, 100% { border-color: #58a6ff66; }
    50%       { border-color: #58a6ffcc; }
  }

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
    background: #222;
    border: 1px solid #3a3a3a;
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
    color: #6e7681;
    background: #1a1a1a;
    border-bottom: 1px solid #222;
    flex-shrink: 0;
  }

  .editor-textarea {
    flex: 1;
    background: #141414;
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
    background: #141414;
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
  .preview-pane table {
    border-collapse: collapse;
    width: 100%;
    margin: .8em 0;
    font-size: .95em;
  }
  .preview-pane th, .preview-pane td {
    border: 1px solid #2d333b;
    padding: 6px 14px;
    text-align: left;
  }
  .preview-pane th {
    background: #161b22;
    color: #e6edf3;
    font-weight: 700;
  }
  .preview-pane tr:nth-child(even) td { background: #111519; }
  .preview-pane tr:hover td { background: #1c2128; }

  /* EMPTY STATE */
  .empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 12px;
    color: #6e7681;
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
    background: #181818;
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
    background: #141414;
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

    // table
    if (/^\|/.test(line) && i + 1 < lines.length && /^\|[\s\-:|]+\|/.test(lines[i + 1])) {
      const tableLines: string[] = [];
      while (i < lines.length && /^\|/.test(lines[i])) {
        tableLines.push(lines[i]); i++;
      }
      const parseRow = (row: string) =>
        row.split("|").slice(1, -1).map(cell => cell.trim());
      const headers = parseRow(tableLines[0]);
      const rows = tableLines.slice(2); // skip separator row
      const thead = `<thead><tr>${headers.map(h => `<th>${inline(h)}</th>`).join("")}</tr></thead>`;
      const tbody = rows.length
        ? `<tbody>${rows.map(r => `<tr>${parseRow(r).map(c => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")}</tbody>`
        : "";
      html.push(`<table>${thead}${tbody}</table>`);
      continue;
    }

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
  path?: string[];                   // sub-carpetas relativas al directorio raíz
}

// ── File tree types & helpers ──────────────────────────────────────────────
type FolderNode = { type: "folder"; name: string; key: string; children: FileTreeItem[] };
type FileTreeItem = Doc | FolderNode;

function groupByFolder(docs: Doc[], depth = 0): FileTreeItem[] {
  const folders = new Map<string, Doc[]>();
  const files: Doc[] = [];

  for (const doc of docs) {
    const p = doc.path ?? [];
    if (p.length <= depth) {
      files.push(doc);
    } else {
      const name = p[depth];
      if (!folders.has(name)) folders.set(name, []);
      folders.get(name)!.push(doc);
    }
  }

  const result: FileTreeItem[] = [];
  for (const [name, children] of [...folders.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const key = children[0].path!.slice(0, depth + 1).join("/");
    result.push({ type: "folder", name, key, children: groupByFolder(children, depth + 1) });
  }
  files.sort((a, b) => a.title.localeCompare(b.title));
  result.push(...files);
  return result;
}

function mergeEmptyFolders(tree: FileTreeItem[], emptyPaths: Iterable<string>): FileTreeItem[] {
  const insert = (segs: string[], nodes: FileTreeItem[], depth: number) => {
    if (depth >= segs.length) return;
    const name = segs[depth];
    let folder = nodes.find(
      n => "type" in n && n.type === "folder" && (n as FolderNode).name === name
    ) as FolderNode | undefined;
    if (!folder) {
      folder = {
        type: "folder",
        name,
        key: segs.slice(0, depth + 1).join("/"),
        children: [],
      };
      // keep folders before files, alphabetical
      const fileStart = nodes.findIndex(n => !("type" in n) || (n as FolderNode).type !== "folder");
      const end = fileStart === -1 ? nodes.length : fileStart;
      let pos = 0;
      while (pos < end && (nodes[pos] as FolderNode).name.localeCompare(name) < 0) pos++;
      nodes.splice(pos, 0, folder);
    }
    insert(segs, folder.children, depth + 1);
  };
  for (const p of emptyPaths) {
    const segs = p.split("/").filter(Boolean);
    if (segs.length) insert(segs, tree, 0);
  }
  return tree;
}

async function readDirRecursive(
  dirHandle: FileSystemDirectoryHandle,
  path: string[] = []
): Promise<Doc[]> {
  const results: Doc[] = [];
  for await (const entry of (dirHandle as unknown as { values(): AsyncIterable<FileSystemHandle> }).values()) {
    if (entry.kind === "file" && /\.(md|markdown|txt)$/i.test(entry.name)) {
      const fileHandle = entry as FileSystemFileHandle;
      const file = await fileHandle.getFile();
      const content = await file.text();
      const title = entry.name.replace(/\.(md|markdown|txt)$/i, "");
      results.push({ id: uid(), title, content, fileHandle, path });
    } else if (entry.kind === "directory") {
      const sub = await readDirRecursive(
        entry as unknown as FileSystemDirectoryHandle,
        [...path, entry.name]
      );
      results.push(...sub);
    }
  }
  return results;
}

// ── Modal types ───────────────────────────────────────────────────────────
type ModalKind =
  | { kind: "new-local" }
  | { kind: "new-fs-file"; path: string[] }
  | { kind: "new-fs-folder"; path: string[] }
  | { kind: "rename-file"; docId: string };

// ── Main component ─────────────────────────────────────────────────────────
export default function App() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [mode, setMode] = useState<"edit" | "view" | "split">("split");
  const [unsaved, setUnsaved] = useState(false);
  const [modalKind, setModalKind] = useState<ModalKind | null>(null);
  const [modalInput, setModalInput] = useState("");
  const [modalContent, setModalContent] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dirName, setDirName] = useState<string | null>(null);
  const [rootDirHandle, setRootDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [emptyFolders, setEmptyFolders] = useState<Set<string>>(new Set());
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [installPrompt, setInstallPrompt] = useState<Event & { prompt(): Promise<void> } | null>(null);
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
    // Web Share Target — abre archivos .md compartidos desde Android
    void (async () => {
      if (!("caches" in window)) return;
      try {
        const cache = await caches.open("share-target-v1");
        const res = await cache.match("/pwa-md-editor/__shared-file__");
        if (!res) return;
        await cache.delete("/pwa-md-editor/__shared-file__");
        const { name, content } = await res.json() as { name: string; content: string };
        const title = name.replace(/\.(md|markdown|txt)$/i, "");
        const doc: Doc = { id: uid(), title, content };
        setDocs(prev => {
          const next = [doc, ...prev];
          try {
            const local = next.filter(d => !d.fileHandle);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(local));
          } catch {}
          return next;
        });
        setActiveId(doc.id);
        setDraftContent(content);
        setUnsaved(false);
      } catch { /* ignorar errores de cache */ }
    })();

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
        const handle = activeDoc.fileHandle as FileSystemFileHandle & {
          queryPermission(desc: { mode: string }): Promise<PermissionState>;
          requestPermission(desc: { mode: string }): Promise<PermissionState>;
        };
        let perm = await handle.queryPermission({ mode: "readwrite" });
        if (perm !== "granted") {
          perm = await handle.requestPermission({ mode: "readwrite" });
        }
        if (perm !== "granted") return;
        const writable = await handle.createWritable();
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

  const removeDocFromState = (id: string) => {
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

  const deleteDoc = async (id: string) => {
    const doc = docs.find(d => d.id === id);
    if (!doc) return;
    if (doc.fileHandle) {
      if (!window.confirm(`Borrar "${doc.title}" del disco?`)) return;
      try {
        const parent = await getDirHandleByPath(doc.path ?? []);
        await parent.removeEntry(doc.fileHandle.name);
      } catch (e) {
        alert("No se pudo borrar: " + (e as Error).message);
        return;
      }
    }
    removeDocFromState(id);
  };

  const getDirHandleByPath = async (path: string[]): Promise<FileSystemDirectoryHandle> => {
    if (!rootDirHandle) throw new Error("No hay directorio anclado");
    let handle = rootDirHandle;
    for (const seg of path) {
      handle = await handle.getDirectoryHandle(seg);
    }
    return handle;
  };

  const ensureFsPermission = async () => {
    if (!rootDirHandle) return false;
    const h = rootDirHandle as FileSystemDirectoryHandle & {
      queryPermission(desc: { mode: string }): Promise<PermissionState>;
      requestPermission(desc: { mode: string }): Promise<PermissionState>;
    };
    let perm = await h.queryPermission({ mode: "readwrite" });
    if (perm !== "granted") perm = await h.requestPermission({ mode: "readwrite" });
    return perm === "granted";
  };

  const entryExists = async (
    parent: FileSystemDirectoryHandle,
    name: string
  ): Promise<"file" | "dir" | null> => {
    try { await parent.getFileHandle(name); return "file"; } catch { /* ignore */ }
    try { await parent.getDirectoryHandle(name); return "dir"; } catch { /* ignore */ }
    return null;
  };

  const createFsFile = async (path: string[], rawName: string, content: string) => {
    if (!rootDirHandle) return;
    const name = rawName.trim();
    if (!name) return;
    if (!(await ensureFsPermission())) return;
    const fileName = /\.(md|markdown|txt)$/i.test(name) ? name : name + ".md";
    try {
      const parent = await getDirHandleByPath(path);
      if (await entryExists(parent, fileName)) {
        alert(`Ya existe "${fileName}" en esta carpeta.`);
        return;
      }
      const handle = await parent.getFileHandle(fileName, { create: true });
      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();
      const title = fileName.replace(/\.(md|markdown|txt)$/i, "");
      const doc: Doc = { id: uid(), title, content, fileHandle: handle, path };
      setDocs(prev => [doc, ...prev]);
      setActiveId(doc.id);
      setDraftContent(content);
      setUnsaved(false);
      setSidebarOpen(false);
      const key = path.join("/");
      if (key) {
        setEmptyFolders(prev => {
          if (!prev.has(key)) return prev;
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    } catch (e) {
      alert("No se pudo crear el archivo: " + (e as Error).message);
    }
  };

  const createFsFolder = async (path: string[], rawName: string) => {
    if (!rootDirHandle) return;
    const name = rawName.trim();
    if (!name) return;
    if (!(await ensureFsPermission())) return;
    try {
      const parent = await getDirHandleByPath(path);
      if (await entryExists(parent, name)) {
        alert(`Ya existe "${name}" en esta carpeta.`);
        return;
      }
      await parent.getDirectoryHandle(name, { create: true });
      const key = [...path, name].join("/");
      setEmptyFolders(prev => new Set(prev).add(key));
      // expand parent so the new folder is visible
      setCollapsedFolders(prev => {
        const pk = path.join("/");
        if (!pk || !prev.has(pk)) return prev;
        const n = new Set(prev);
        n.delete(pk);
        return n;
      });
    } catch (e) {
      alert("No se pudo crear la carpeta: " + (e as Error).message);
    }
  };

  const renameFsFile = async (doc: Doc, rawName: string) => {
    if (!rootDirHandle || !doc.fileHandle) return;
    const name = rawName.trim();
    if (!name) return;
    const oldName = doc.fileHandle.name;
    const origExt = oldName.match(/\.(md|markdown|txt)$/i)?.[0] ?? ".md";
    const fileName = /\.(md|markdown|txt)$/i.test(name) ? name : name + origExt;
    if (fileName === oldName) return;
    if (!(await ensureFsPermission())) return;
    try {
      const parent = await getDirHandleByPath(doc.path ?? []);
      if (await entryExists(parent, fileName)) {
        alert(`Ya existe "${fileName}" en esta carpeta.`);
        return;
      }
      const liveContent = activeId === doc.id ? draftContent : doc.content;
      const newHandle = await parent.getFileHandle(fileName, { create: true });
      const writable = await newHandle.createWritable();
      await writable.write(liveContent);
      await writable.close();
      await parent.removeEntry(oldName);
      const title = fileName.replace(/\.(md|markdown|txt)$/i, "");
      setDocs(prev => prev.map(d =>
        d.id === doc.id ? { ...d, title, content: liveContent, fileHandle: newHandle } : d
      ));
      if (activeId === doc.id) setUnsaved(false);
    } catch (e) {
      alert("No se pudo renombrar: " + (e as Error).message);
    }
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

      const newDocs = await readDirRecursive(dirHandle);
      newDocs.sort((a, b) => {
        const pa = (a.path ?? []).join("/");
        const pb = (b.path ?? []).join("/");
        if (pa !== pb) return pa.localeCompare(pb);
        return a.title.localeCompare(b.title);
      });
      setCollapsedFolders(new Set());

      setDirName(dirHandle.name);
      setRootDirHandle(dirHandle);
      setEmptyFolders(new Set());
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
    setRootDirHandle(null);
    setEmptyFolders(new Set());
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

  const toggleFolder = (key: string) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
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

  const openModal = (kind: ModalKind) => {
    setModalKind(kind);
    if (kind.kind === "rename-file") {
      const d = docs.find(x => x.id === kind.docId);
      setModalInput(d?.title ?? "");
      setModalContent("");
    } else {
      setModalInput("");
      setModalContent("");
    }
    setTimeout(() => {
      const el = modalInputRef.current;
      if (!el) return;
      el.focus();
      if (kind.kind === "rename-file") el.select();
    }, 50);
  };
  const closeModal = () => setModalKind(null);

  const createLocalDoc = () => {
    const title = modalInput.trim() || "Sin título";
    const doc: Doc = { id: uid(), title, content: modalContent };
    const next = [doc, ...docs];
    setDocs(next);
    setActiveId(doc.id);
    setDraftContent(doc.content);
    setUnsaved(false);
    setSidebarOpen(false);
    persist(next);
  };

  const confirmModal = async () => {
    if (!modalKind) return;
    if (modalKind.kind === "new-local") {
      createLocalDoc();
    } else if (modalKind.kind === "new-fs-file") {
      if (!modalInput.trim()) return;
      await createFsFile(modalKind.path, modalInput, modalContent);
    } else if (modalKind.kind === "new-fs-folder") {
      if (!modalInput.trim()) return;
      await createFsFolder(modalKind.path, modalInput);
    } else if (modalKind.kind === "rename-file") {
      if (!modalInput.trim()) return;
      const d = docs.find(x => x.id === modalKind.docId);
      if (d) await renameFsFile(d, modalInput);
    }
    setModalKind(null);
  };

  // Captura el prompt de instalación PWA
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as Event & { prompt(): Promise<void> });
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setInstallPrompt(null));
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

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
            <button className="btn-new" onClick={() => openModal({ kind: "new-local" })} title="Nuevo documento local">＋</button>
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
              <button
                className="btn-row-act"
                onClick={() => openModal({ kind: "new-fs-file", path: [] })}
                title="Nuevo archivo en la raíz"
              >＋</button>
              <button
                className="btn-row-act"
                onClick={() => openModal({ kind: "new-fs-folder", path: [] })}
                title="Nueva carpeta en la raíz"
              >⊟</button>
              <button className="btn-unpin" onClick={unpinDirectory} title="Desanclar directorio">✕</button>
            </div>
          )}
          <div className="doc-list">
            {docs.length === 0 && (
              <div style={{ padding: "16px", color: "#6e7681", fontSize: "11px", textAlign: "center" }}>
                Sin documentos
              </div>
            )}
            {(() => {
              const dirDocs = docs.filter(d => d.fileHandle);
              const localDocs = docs.filter(d => !d.fileHandle);

              const renderDocItem = (doc: Doc, depth = 0) => (
                <div
                  key={doc.id}
                  className={`doc-item${activeId === doc.id ? " active" : ""}${activeId === doc.id && unsaved ? " unsaved" : ""}`}
                  style={{ paddingLeft: `${14 + depth * 14}px` }}
                  onClick={() => selectDoc(doc)}
                >
                  <div className="doc-item-dot" />
                  <div className="doc-item-name" title={doc.title}>{doc.title}</div>
                  {doc.fileHandle && (
                    <button
                      className="btn-row-act"
                      title="Renombrar"
                      onClick={e => { e.stopPropagation(); openModal({ kind: "rename-file", docId: doc.id }); }}
                    >✎</button>
                  )}
                  <button
                    className="btn-del"
                    title="Eliminar"
                    onClick={e => { e.stopPropagation(); void deleteDoc(doc.id); }}
                  >×</button>
                </div>
              );

              const renderTree = (items: FileTreeItem[], depth = 0): React.ReactNode =>
                items.map(item => {
                  if ("type" in item && item.type === "folder") {
                    const collapsed = collapsedFolders.has(item.key);
                    const segs = item.key.split("/").filter(Boolean);
                    return (
                      <div key={item.key} className="tree-section">
                        <div
                          className="folder-row"
                          style={{ paddingLeft: `${14 + depth * 14}px` }}
                          onClick={() => toggleFolder(item.key)}
                        >
                          <span className="folder-chevron">{collapsed ? "▶" : "▼"}</span>
                          <span className="folder-icon">{collapsed ? "📁" : "📂"}</span>
                          <span className="folder-name">{item.name}</span>
                          <button
                            className="btn-row-act"
                            title="Nuevo archivo aquí"
                            onClick={e => { e.stopPropagation(); openModal({ kind: "new-fs-file", path: segs }); }}
                          >＋</button>
                          <button
                            className="btn-row-act"
                            title="Nueva subcarpeta"
                            onClick={e => { e.stopPropagation(); openModal({ kind: "new-fs-folder", path: segs }); }}
                          >⊟</button>
                        </div>
                        {!collapsed && renderTree(item.children, depth + 1)}
                      </div>
                    );
                  }
                  return renderDocItem(item as Doc, depth);
                });

              const showFsTree = dirName !== null;
              const fsTree = showFsTree ? mergeEmptyFolders(groupByFolder(dirDocs), emptyFolders) : [];

              return (
                <>
                  {showFsTree && renderTree(fsTree)}
                  {showFsTree && localDocs.length > 0 && (
                    <div style={{ height: "1px", background: "#1e1e1e", margin: "4px 0" }} />
                  )}
                  {localDocs.map(doc => renderDocItem(doc, 0))}
                </>
              );
            })()}
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
                : <span style={{color:"#6e7681"}}>ningún documento</span>}
            </div>
            {installPrompt && (
              <button
                className="btn-install"
                onClick={async () => { await installPrompt.prompt(); setInstallPrompt(null); }}
                title="Instalar como aplicación"
              >
                ↓ instalar
              </button>
            )}
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
        {modalKind && (() => {
          const k = modalKind.kind;
          const pathStr =
            (k === "new-fs-file" || k === "new-fs-folder")
              ? (modalKind.path.length ? modalKind.path.join("/") : (dirName ?? "raíz"))
              : "";
          const title =
            k === "new-local" ? "nuevo documento"
            : k === "new-fs-file" ? `nuevo archivo en ${pathStr}`
            : k === "new-fs-folder" ? `nueva carpeta en ${pathStr}`
            : "renombrar archivo";
          const inputLabel =
            k === "new-fs-folder" ? "nombre de la carpeta"
            : k === "rename-file" ? "nuevo nombre"
            : "título";
          const inputPlaceholder =
            k === "new-fs-folder" ? "mi-carpeta"
            : k === "new-fs-file" ? "mi-archivo"
            : k === "rename-file" ? "nuevo-nombre"
            : "Mi documento";
          const showContent = k === "new-local" || k === "new-fs-file";
          const confirmLabel = k === "rename-file" ? "renombrar" : "crear";
          return (
            <div className="modal-overlay" onClick={e => e.target === e.currentTarget && closeModal()}>
              <div className="modal">
                <div className="modal-title">{title}</div>
                <div className="modal-field">
                  <label className="modal-label">{inputLabel}</label>
                  <input
                    ref={modalInputRef}
                    className="modal-input"
                    value={modalInput}
                    onChange={e => setModalInput(e.target.value)}
                    placeholder={inputPlaceholder}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void confirmModal(); } }}
                  />
                </div>
                {showContent && (
                  <div className="modal-field">
                    <label className="modal-label">contenido inicial (opcional)</label>
                    <textarea
                      className="modal-textarea"
                      value={modalContent}
                      onChange={e => setModalContent(e.target.value)}
                      placeholder={"# Título\n\nContenido..."}
                    />
                  </div>
                )}
                <div className="modal-actions">
                  <button className="btn-cancel" onClick={closeModal}>cancelar</button>
                  <button className="btn-confirm" onClick={() => void confirmModal()}>{confirmLabel}</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </>
  );
}
