import { useEffect } from 'react'
import { Icon } from './Icon'
import type { IconName } from './Icon'

export interface ContextMenuItem {
  label?: string
  icon?: IconName
  onClick?: () => void
  shortcut?: string
  danger?: boolean
  sep?: boolean
}

export interface ContextMenuState {
  x: number
  y: number
  items: ContextMenuItem[]
}

interface Props {
  menu: ContextMenuState | null
  onClose: () => void
}

export function ContextMenu({ menu, onClose }: Props) {
  useEffect(() => {
    window.addEventListener('click', onClose)
    window.addEventListener('resize', onClose)
    window.addEventListener('scroll', onClose, true)
    return () => {
      window.removeEventListener('click', onClose)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [onClose])

  if (!menu) return null
  const { x, y, items } = menu
  const style = {
    left: Math.min(x, window.innerWidth - 200),
    top: Math.min(y, window.innerHeight - items.length * 32 - 16),
  }

  return (
    <div className="context-menu" style={style} onClick={(e) => e.stopPropagation()}>
      {items.map((it, i) =>
        it.sep ? (
          <div key={i} className="cm-sep" />
        ) : (
          <button
            key={i}
            className={`cm-item ${it.danger ? 'danger' : ''}`}
            onClick={() => { it.onClick?.(); onClose() }}
          >
            {it.icon && <Icon name={it.icon} />}
            <span>{it.label}</span>
            {it.shortcut && <span className="cm-shortcut">{it.shortcut}</span>}
          </button>
        )
      )}
    </div>
  )
}
