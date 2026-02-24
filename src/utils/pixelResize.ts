/**
 * Redimensiona uma imagem usando interpolação Nearest-Neighbor (sem suavização),
 * respeitando os pixels originais — ideal para pixel art.
 */
export async function resizePixelArt(
  file: File,
  scale: number,               // 0.0 – 1.0  (ex: 0.5 = 50%)
  targetWidth?: number,        // largura exata (opcional)
  targetHeight?: number        // altura exata (opcional)
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(url)

      const srcW = img.naturalWidth
      const srcH = img.naturalHeight

      const dstW = Math.max(1, Math.round(targetWidth  ?? srcW * scale))
      const dstH = Math.max(1, Math.round(targetHeight ?? srcH * scale))

      // Canvas de origem (lê pixels originais)
      const srcCanvas = document.createElement('canvas')
      srcCanvas.width  = srcW
      srcCanvas.height = srcH
      const srcCtx = srcCanvas.getContext('2d')!
      srcCtx.drawImage(img, 0, 0)
      const srcData = srcCtx.getImageData(0, 0, srcW, srcH)

      // Canvas de destino
      const dstCanvas = document.createElement('canvas')
      dstCanvas.width  = dstW
      dstCanvas.height = dstH
      const dstCtx = dstCanvas.getContext('2d')!
      const dstData = dstCtx.createImageData(dstW, dstH)

      // Nearest-neighbor manual — garante zero blur
      const xRatio = srcW / dstW
      const yRatio = srcH / dstH

      for (let y = 0; y < dstH; y++) {
        for (let x = 0; x < dstW; x++) {
          const srcX = Math.floor(x * xRatio)
          const srcY = Math.floor(y * yRatio)

          const srcIdx = (srcY * srcW + srcX) * 4
          const dstIdx = (y    * dstW + x   ) * 4

          dstData.data[dstIdx    ] = srcData.data[srcIdx    ] // R
          dstData.data[dstIdx + 1] = srcData.data[srcIdx + 1] // G
          dstData.data[dstIdx + 2] = srcData.data[srcIdx + 2] // B
          dstData.data[dstIdx + 3] = srcData.data[srcIdx + 3] // A
        }
      }

      dstCtx.putImageData(dstData, 0, 0)

      // Detecta o tipo original para manter formato (PNG por padrão para pixel art)
      const mime = file.type === 'image/gif' ? 'image/png' : (file.type || 'image/png')

      dstCanvas.toBlob(
        (blob) => {
          if (!blob) { reject(new Error('Falha ao gerar blob')); return }
          resolve({ blob, width: dstW, height: dstH })
        },
        mime,
        1.0   // qualidade máxima
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error(`Não foi possível carregar: ${file.name}`))
    }

    img.src = url
  })
}

/** Gera um data-URL de preview (não precisa de blob) */
export function getImageURL(file: File): string {
  return URL.createObjectURL(file)
}

/** Retorna dimensões de uma imagem */
export async function getImageDimensions(
  file: File
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject() }
    img.src = url
  })
}
