export type IconName =
  | 'chev-right' | 'chev-down' | 'folder' | 'folder-open' | 'file' | 'file-md'
  | 'plus' | 'new-file' | 'new-folder' | 'close' | 'search' | 'edit' | 'trash'
  | 'rename' | 'copy' | 'eye' | 'columns' | 'pen' | 'sidebar' | 'command'
  | 'sliders' | 'moon' | 'sun' | 'check' | 'download' | 'save' | 'book'

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName
}

export function Icon({ name, ...p }: IconProps) {
  const common: React.SVGProps<SVGSVGElement> = {
    width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none',
    stroke: 'currentColor', strokeWidth: 1.75,
    strokeLinecap: 'round', strokeLinejoin: 'round',
    ...p,
  };
  switch (name) {
    case 'chev-right':   return <svg {...common}><path d="M9 6l6 6-6 6"/></svg>;
    case 'chev-down':    return <svg {...common}><path d="M6 9l6 6 6-6"/></svg>;
    case 'folder':       return <svg {...common}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>;
    case 'folder-open':  return <svg {...common}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v1H3V7z"/><path d="M3 9h18l-2 8a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/></svg>;
    case 'file':         return <svg {...common}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"/><path d="M14 3v5h5"/></svg>;
    case 'file-md':      return <svg {...common}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"/><path d="M14 3v5h5"/><path d="M8 14v-3l1.5 2L11 11v3M14 11v3M14 14h2l-1 -1"/></svg>;
    case 'plus':         return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    case 'new-file':     return <svg {...common}><path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z"/><path d="M14 3v5h5"/><path d="M10 14h4M12 12v4"/></svg>;
    case 'new-folder':   return <svg {...common}><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/><path d="M10 14h4M12 12v4"/></svg>;
    case 'close':        return <svg {...common}><path d="M18 6L6 18M6 6l12 12"/></svg>;
    case 'search':       return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>;
    case 'edit':         return <svg {...common}><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>;
    case 'trash':        return <svg {...common}><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>;
    case 'rename':       return <svg {...common}><path d="M4 7V5a1 1 0 011-1h3M4 17v2a1 1 0 001 1h3M16 4h3a1 1 0 011 1v2M16 20h3a1 1 0 001-1v-2"/><path d="M9 8v8M9 12h6M15 8v8"/></svg>;
    case 'copy':         return <svg {...common}><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>;
    case 'eye':          return <svg {...common}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'columns':      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/></svg>;
    case 'pen':          return <svg {...common}><path d="M12 19l7-7 3 3-7 7-3-3zM18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5zM2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>;
    case 'sidebar':      return <svg {...common}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/></svg>;
    case 'command':      return <svg {...common}><path d="M18 3a3 3 0 00-3 3v12a3 3 0 003 3 3 3 0 003-3 3 3 0 00-3-3H6a3 3 0 00-3 3 3 3 0 003 3 3 3 0 003-3V6a3 3 0 00-3-3 3 3 0 00-3 3 3 3 0 003 3h12a3 3 0 003-3 3 3 0 00-3-3z"/></svg>;
    case 'sliders':      return <svg {...common}><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/></svg>;
    case 'moon':         return <svg {...common}><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>;
    case 'sun':          return <svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>;
    case 'check':        return <svg {...common}><path d="M20 6L9 17l-5-5"/></svg>;
    case 'download':     return <svg {...common}><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>;
    case 'save':         return <svg {...common}><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>;
    case 'book':         return <svg {...common}><path d="M4 19.5A2.5 2.5 0 016.5 17H20V2H6.5A2.5 2.5 0 004 4.5v15zM4 19.5A2.5 2.5 0 006.5 22H20v-5"/></svg>;
    default:             return null;
  }
}
