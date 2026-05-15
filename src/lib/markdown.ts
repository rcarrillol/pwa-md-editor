const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string));

function inline(s: string): string {
  s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_, alt, url, title) => `<img alt="${esc(alt)}" src="${esc(url)}"${title ? ` title="${esc(title)}"` : ''}>`);
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (_, text, url, title) => {
      const titleAttr = title ? ` title="${esc(title)}"` : '';
      if (url.startsWith('#'))
        return `<a href="${esc(url)}"${titleAttr}>${inline(text)}</a>`;
      const [path, hash = ''] = url.split('#');
      const isInternal = /^(?!https?:|mailto:|\/\/).*\.(md|markdown|txt)$/i.test(path);
      if (isInternal)
        return `<a data-internal-link="${esc(path)}"${hash ? ` data-internal-hash="${esc(hash)}"` : ''}${titleAttr}>${inline(text)}</a>`;
      return `<a href="${esc(url)}"${titleAttr} target="_blank" rel="noopener">${inline(text)}</a>`;
    });
  s = s.replace(/`([^`]+)`/g, (_, c) => `<code>${esc(c)}</code>`);
  s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^_])_([^_\n]+)_/g, '$1<em>$2</em>');
  s = s.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
  return s;
}

function parseTable(lines: string[], i: number): { html: string; next: number } | null {
  if (i + 1 >= lines.length) return null;
  const header = lines[i], sep = lines[i + 1];
  if (!/\|/.test(header) || !/^\s*\|?[\s:\-|]+\|?\s*$/.test(sep)) return null;
  const cells = (row: string) => row.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());
  const headerCells = cells(header);
  const aligns = cells(sep).map(s => {
    const L = s.startsWith(':'), R = s.endsWith(':');
    return L && R ? 'center' : R ? 'right' : L ? 'left' : null;
  });
  let j = i + 2;
  const rows: string[][] = [];
  while (j < lines.length && /\|/.test(lines[j]) && lines[j].trim()) {
    rows.push(cells(lines[j])); j++;
  }
  let html = '<table><thead><tr>';
  headerCells.forEach((c, k) => html += `<th${aligns[k] ? ` style="text-align:${aligns[k]}"` : ''}>${inline(esc(c))}</th>`);
  html += '</tr></thead><tbody>';
  rows.forEach(r => {
    html += '<tr>';
    r.forEach((c, k) => html += `<td${aligns[k] ? ` style="text-align:${aligns[k]}"` : ''}>${inline(esc(c))}</td>`);
    html += '</tr>';
  });
  html += '</tbody></table>';
  return { html, next: j };
}

function parseList(lines: string[], i: number): { html: string; next: number } | null {
  const items: { content: string; task: boolean | null; sub: string }[] = [];
  let j = i;
  const indentOf = (s: string) => s.match(/^\s*/)![0].length;
  const baseIndent = indentOf(lines[j]);
  const re = /^(\s*)([-*+]|\d+\.)\s+(.*)$/;
  const firstMatch = lines[j].match(re);
  if (!firstMatch) return null;
  const ordered = /\d+\./.test(firstMatch[2]);

  while (j < lines.length) {
    const line = lines[j];
    if (!line.trim()) {
      if (j + 1 < lines.length && re.test(lines[j + 1]) && indentOf(lines[j + 1]) === baseIndent) {
        j++; continue;
      }
      break;
    }
    const m = line.match(re);
    if (!m || indentOf(line) < baseIndent) break;
    if (indentOf(line) > baseIndent) {
      const sub: string[] = [];
      while (j < lines.length && (indentOf(lines[j]) > baseIndent || !lines[j].trim())) {
        sub.push(lines[j].slice(baseIndent + 2)); j++;
      }
      const subHtml = render(sub.join('\n'));
      if (items.length) items[items.length - 1].sub = (items[items.length - 1].sub || '') + subHtml;
      continue;
    }
    let content = m[3];
    let task: boolean | null = null;
    const tm = content.match(/^\[( |x|X)\]\s+(.*)$/);
    if (tm) { task = tm[1].toLowerCase() === 'x'; content = tm[2]; }
    items.push({ content: inline(esc(content)), task, sub: '' });
    j++;
  }

  const tag = ordered ? 'ol' : 'ul';
  const anyTask = items.some(it => it.task !== null);
  let html = `<${tag}${anyTask ? ' class="task-list"' : ''}>`;
  items.forEach(it => {
    const cls = it.task !== null ? ' class="task-item"' : '';
    const cb = it.task !== null ? `<input type="checkbox" disabled${it.task ? ' checked' : ''}>` : '';
    html += `<li${cls}>${cb}${it.content}${it.sub}</li>`;
  });
  html += `</${tag}>`;
  return { html, next: j };
}

export function render(src: string): string {
  src = src.replace(/\r\n?/g, '\n');
  const lines = src.split('\n');
  let out = '';
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      const lang = fence[1];
      let j = i + 1;
      const codeLines: string[] = [];
      while (j < lines.length && !/^```\s*$/.test(lines[j])) { codeLines.push(lines[j]); j++; }
      out += `<pre><code${lang ? ` class="lang-${esc(lang)}"` : ''}>${esc(codeLines.join('\n'))}</code></pre>`;
      i = j + 1; continue;
    }

    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      const lv = h[1].length;
      const text = h[2].replace(/\s+#+\s*$/, '');
      const slug = text.toLowerCase().replace(/[^\w\s-]/g, '').trim().replace(/\s/g, '-');
      out += `<h${lv} id="${slug}">${inline(esc(text))}</h${lv}>`;
      i++; continue;
    }

    if (/^(\s*)(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { out += '<hr>'; i++; continue; }

    if (/^>\s?/.test(line)) {
      const buf: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
      out += `<blockquote>${render(buf.join('\n'))}</blockquote>`;
      continue;
    }

    if (/\|/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:\-|]+\|?\s*$/.test(lines[i + 1])) {
      const t = parseTable(lines, i);
      if (t) { out += t.html; i = t.next; continue; }
    }

    if (/^\s*([-*+]|\d+\.)\s+/.test(line)) {
      const l = parseList(lines, i);
      if (l) { out += l.html; i = l.next; continue; }
    }

    if (!line.trim()) { i++; continue; }

    const buf = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^(#{1,6}\s|```|>\s?|(\s*)([-*+]|\d+\.)\s)/.test(lines[i]) && !/^(\s*)(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])) {
      buf.push(lines[i]); i++;
    }
    out += `<p>${inline(esc(buf.join('\n')))}</p>`;
  }
  return out;
}
