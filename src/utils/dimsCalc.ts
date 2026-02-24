import type { ResizeConfig } from '../types'

/** Arredonda `v` para o múltiplo de `snap` mais próximo (mínimo snap). */
function snapTo(v: number, snap: number): number {
  return Math.max(snap, Math.round(v / snap) * snap)
}

/**
 * Calcula as dimensões de saída baseado na configuração atual.
 * Se snapToGrid estiver ativo, as dimensões são forçadas para múltiplos
 * exatos do gridSize — essencial para tilesets não distorcerem.
 */
export function computeOutDims(
  srcW: number,
  srcH: number,
  config: ResizeConfig
): { w: number; h: number; snapped: boolean } {
  let w: number
  let h: number

  if (config.scaleMode === 'percent') {
    w = Math.max(1, Math.round(srcW * config.scale / 100))
    h = Math.max(1, Math.round(srcH * config.scale / 100))
  } else {
    // --- modo pixels ---
    const ew = config.exactWidth  !== '' ? config.exactWidth  : null
    const eh = config.exactHeight !== '' ? config.exactHeight : null

    if (ew !== null && eh !== null) {
      w = Math.max(1, ew); h = Math.max(1, eh)
    } else if (ew !== null) {
      w = Math.max(1, ew); h = Math.max(1, Math.round(srcH * ew / srcW))
    } else if (eh !== null) {
      w = Math.max(1, Math.round(srcW * eh / srcH)); h = Math.max(1, eh)
    } else {
      w = Math.max(1, Math.round(srcW * config.scale / 100))
      h = Math.max(1, Math.round(srcH * config.scale / 100))
    }
  }

  // Snap para múltiplo do gridSize, se ativado
  const grid = config.gridSize
  if (config.snapToGrid && grid > 0) {
    const sw = snapTo(w, grid)
    const sh = snapTo(h, grid)
    const snapped = sw !== w || sh !== h
    return { w: sw, h: sh, snapped }
  }

  return { w, h, snapped: false }
}
