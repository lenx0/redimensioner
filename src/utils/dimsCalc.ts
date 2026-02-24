import type { ResizeConfig } from '../types'

/**
 * Calcula as dimensões de saída baseado na configuração atual.
 * Usado em preview, batch list e no processamento final.
 */
export function computeOutDims(
  srcW: number,
  srcH: number,
  config: ResizeConfig
): { w: number; h: number } {
  if (config.scaleMode === 'percent') {
    return {
      w: Math.max(1, Math.round(srcW * config.scale / 100)),
      h: Math.max(1, Math.round(srcH * config.scale / 100)),
    }
  }

  // --- modo pixels ---
  const ew = config.exactWidth  !== '' ? config.exactWidth  : null
  const eh = config.exactHeight !== '' ? config.exactHeight : null

  if (ew !== null && eh !== null) {
    return { w: Math.max(1, ew), h: Math.max(1, eh) }
  }
  if (ew !== null) {
    return { w: Math.max(1, ew), h: Math.max(1, Math.round(srcH * ew / srcW)) }
  }
  if (eh !== null) {
    return { w: Math.max(1, Math.round(srcW * eh / srcH)), h: Math.max(1, eh) }
  }

  // fallback: usa a escala percentual
  return {
    w: Math.max(1, Math.round(srcW * config.scale / 100)),
    h: Math.max(1, Math.round(srcH * config.scale / 100)),
  }
}
