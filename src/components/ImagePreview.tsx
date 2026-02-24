import { useRef, useEffect, useState, useCallback } from 'react'
import type { ImageItem, GridSize, ResizeConfig } from '../types'
import { computeOutDims } from '../utils/dimsCalc'
import styles from './ImagePreview.module.css'

interface Props {
  item: ImageItem
  config: ResizeConfig
}

/** Resize nearest-neighbor direto no canvas — preview em tempo real */
function renderNearest(
  ctx: CanvasRenderingContext2D,
  srcImg: HTMLImageElement,
  dstW: number,
  dstH: number
) {
  const srcW = srcImg.naturalWidth
  const srcH = srcImg.naturalHeight
  const src  = document.createElement('canvas')
  src.width  = srcW; src.height = srcH
  const sctx = src.getContext('2d')!
  sctx.drawImage(srcImg, 0, 0)
  const srcData = sctx.getImageData(0, 0, srcW, srcH)
  const dstData = ctx.createImageData(dstW, dstH)
  const xR = srcW / dstW
  const yR = srcH / dstH
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const si = (Math.floor(y * yR) * srcW + Math.floor(x * xR)) * 4
      const di = (y * dstW + x) * 4
      dstData.data[di    ] = srcData.data[si    ]
      dstData.data[di + 1] = srcData.data[si + 1]
      dstData.data[di + 2] = srcData.data[si + 2]
      dstData.data[di + 3] = srcData.data[si + 3]
    }
  }
  ctx.putImageData(dstData, 0, 0)
}

type DragMode = 'pan' | 'grid'

export default function ImagePreview({ item, config }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef   = useRef<HTMLDivElement>(null)
  const srcImgRef = useRef<HTMLImageElement | null>(null)

  const [zoom,     setZoom]     = useState(1)
  const [dragMode, setDragMode] = useState<DragMode>('pan')
  const [gridOffset, setGridOffset] = useState({ x: 0, y: 0 })

  const dragging  = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, sl: 0, st: 0, gx: 0, gy: 0 })

  const { w: outW, h: outH } = computeOutDims(item.srcWidth, item.srcHeight, config)

  // ── Desenha imagem + grade no canvas ──
  const redraw = useCallback((img: HTMLImageElement, w: number, h: number, ox: number, oy: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width  = w
    canvas.height = h
    renderNearest(ctx, img, w, h)
    if (config.showGrid && config.gridSize > 0) {
      drawGrid(ctx, w, h, config.gridSize, ox, oy)
    }
  }, [config])

  // Recarrega a imagem fonte apenas quando o arquivo muda
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      srcImgRef.current = img
      redraw(img, outW, outH, gridOffset.x, gridOffset.y)
    }
    img.src = item.previewUrl
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.previewUrl])

  // Redesenha quando dimensões, grade ou offset mudam
  useEffect(() => {
    if (srcImgRef.current) {
      redraw(srcImgRef.current, outW, outH, gridOffset.x, gridOffset.y)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outW, outH, config.showGrid, config.gridSize, gridOffset])

  // ── Handlers de drag ──
  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current
    if (!wrap) return
    dragging.current = true
    dragStart.current = {
      x:  e.clientX,
      y:  e.clientY,
      sl: wrap.scrollLeft,
      st: wrap.scrollTop,
      gx: gridOffset.x,
      gy: gridOffset.y,
    }
    wrap.setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [gridOffset])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y

    if (dragMode === 'pan') {
      if (!wrapRef.current) return
      wrapRef.current.scrollLeft = dragStart.current.sl - dx
      wrapRef.current.scrollTop  = dragStart.current.st - dy
    } else {
      // Move o offset da grade em coordenadas de pixel da imagem (divide pelo zoom)
      const nx = dragStart.current.gx + Math.round(dx / zoom)
      const ny = dragStart.current.gy + Math.round(dy / zoom)
      setGridOffset({ x: nx, y: ny })
    }
  }, [dragMode, zoom])

  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  const resetOffset = useCallback(() => setGridOffset({ x: 0, y: 0 }), [])

  // Offset normalizado para exibição (dentro de uma célula)
  const size = config.gridSize || 1
  const dispOx = ((gridOffset.x % size) + size) % size
  const dispOy = ((gridOffset.y % size) + size) % size

  return (
    <div className={styles.wrapper}>
      {/* Header info */}
      <div className={styles.info}>
        <span className={styles.filename} title={item.file.name}>{item.file.name}</span>
        <span className={styles.dims}>
          {item.srcWidth}×{item.srcHeight}
          <span className={styles.arrow}>→</span>
          <span className={item.outputBlob ? styles.done : styles.pending}>
            {outW}×{outH}
          </span>
        </span>
      </div>

      {/* Toolbar de modo + offset */}
      <div className={styles.toolbar}>
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeBtn} ${dragMode === 'pan' ? styles.modeActive : ''}`}
            onClick={() => setDragMode('pan')}
            title="Arrastar move o viewport"
          >
            🖐 Pan
          </button>
          <button
            className={`${styles.modeBtn} ${dragMode === 'grid' ? styles.modeGridActive : ''}`}
            onClick={() => setDragMode('grid')}
            title="Arrastar move a grade"
            disabled={!config.showGrid || config.gridSize === 0}
          >
            ⊞ Grade
          </button>
        </div>

        {config.showGrid && config.gridSize > 0 && (
          <div className={styles.offsetInfo}>
            <span className={styles.offsetLabel}>offset</span>
            <span className={styles.offsetVal}>{dispOx}×{dispOy}</span>
            {(dispOx !== 0 || dispOy !== 0) && (
              <button className={styles.resetBtn} onClick={resetOffset} title="Resetar offset">↺</button>
            )}
          </div>
        )}
      </div>

      {/* Canvas preview */}
      <div
        ref={wrapRef}
        className={`${styles.canvasWrap} ${dragMode === 'grid' ? styles.canvasGrid : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          style={{
            imageRendering: 'pixelated',
            width:  outW * zoom,
            height: outH * zoom,
          }}
        />
        {item.status === 'processing' && (
          <div className={styles.overlay}><div className={styles.spinner} /></div>
        )}
        {item.status === 'error' && (
          <div className={`${styles.overlay} ${styles.overlayErr}`}>
            <span>⚠ {item.error}</span>
          </div>
        )}
      </div>

      {/* Zoom */}
      <div className={styles.zoomRow}>
        <label>Zoom</label>
        <input
          type="range" min={1} max={16} step={1} value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
        />
        <span className={styles.mono}>{zoom}×</span>
      </div>
    </div>
  )
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  size: GridSize,
  ox: number,
  oy: number
) {
  ctx.save()
  ctx.setLineDash([])

  // Normaliza o offset para dentro de uma célula (positivo)
  const startX = ((ox % size) + size) % size
  const startY = ((oy % size) + size) % size

  // Coleta posições X: começa no offset normalizado, avança de `size` em `size`
  // Inclui a borda 0 e a borda w
  const xs: number[] = [0]
  for (let x = startX === 0 ? size : startX; x <= w; x += size) xs.push(x)
  if (xs[xs.length - 1] !== w) xs.push(w)

  const ys: number[] = [0]
  for (let y = startY === 0 ? size : startY; y <= h; y += size) ys.push(y)
  if (ys[ys.length - 1] !== h) ys.push(h)

  // Camada 1: sombra escura
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)'
  ctx.lineWidth   = 1
  for (const x of xs) {
    ctx.beginPath(); ctx.moveTo(x - 0.5, 0); ctx.lineTo(x - 0.5, h); ctx.stroke()
  }
  for (const y of ys) {
    ctx.beginPath(); ctx.moveTo(0, y - 0.5); ctx.lineTo(w, y - 0.5); ctx.stroke()
  }

  // Camada 2: linha amarela de 1px
  ctx.strokeStyle = 'rgba(255, 225, 0, 1)'
  ctx.lineWidth   = 1
  for (const x of xs) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
  }
  for (const y of ys) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }

  ctx.restore()
}


interface Props {
  item: ImageItem
  config: ResizeConfig
}

/** Resize nearest-neighbor direto no canvas — preview em tempo real */
function renderNearest(
  ctx: CanvasRenderingContext2D,
  srcImg: HTMLImageElement,
  dstW: number,
  dstH: number
) {
  const srcW = srcImg.naturalWidth
  const srcH = srcImg.naturalHeight

  // Canvas auxiliar para ler pixels da fonte
  const src = document.createElement('canvas')
  src.width = srcW; src.height = srcH
  const sctx = src.getContext('2d')!
  sctx.drawImage(srcImg, 0, 0)
  const srcData = sctx.getImageData(0, 0, srcW, srcH)

  const dstData = ctx.createImageData(dstW, dstH)
  const xR = srcW / dstW
  const yR = srcH / dstH

  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const si = (Math.floor(y * yR) * srcW + Math.floor(x * xR)) * 4
      const di = (y * dstW + x) * 4
      dstData.data[di    ] = srcData.data[si    ]
      dstData.data[di + 1] = srcData.data[si + 1]
      dstData.data[di + 2] = srcData.data[si + 2]
      dstData.data[di + 3] = srcData.data[si + 3]
    }
  }
  ctx.putImageData(dstData, 0, 0)
}

export default function ImagePreview({ item, config }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const wrapRef    = useRef<HTMLDivElement>(null)
  const srcImgRef  = useRef<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)

  // ── Pan / drag ──
  const dragging  = useRef(false)
  const dragStart = useRef({ x: 0, y: 0, sl: 0, st: 0 })

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const wrap = wrapRef.current
    if (!wrap) return
    dragging.current = true
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      sl: wrap.scrollLeft,
      st: wrap.scrollTop,
    }
    wrap.setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [])

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !wrapRef.current) return
    const dx = e.clientX - dragStart.current.x
    const dy = e.clientY - dragStart.current.y
    wrapRef.current.scrollLeft = dragStart.current.sl - dx
    wrapRef.current.scrollTop  = dragStart.current.st - dy
  }, [])

  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  const { w: outW, h: outH } = computeOutDims(item.srcWidth, item.srcHeight, config)

  // Redesenha no canvas com nearest-neighbor + grade
  const redraw = useCallback((img: HTMLImageElement, w: number, h: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    canvas.width  = w
    canvas.height = h
    renderNearest(ctx, img, w, h)
    if (config.showGrid && config.gridSize > 0) {
      drawGrid(ctx, w, h, config.gridSize)
    }
  }, [config])

  // Recarrega imagem fonte apenas quando o arquivo muda
  useEffect(() => {
    const img = new Image()
    img.onload = () => {
      srcImgRef.current = img
      redraw(img, outW, outH)
    }
    img.src = item.previewUrl
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.previewUrl])

  // Redesenha quando escala ou grade muda (sem recarregar a imagem)
  useEffect(() => {
    if (srcImgRef.current) {
      redraw(srcImgRef.current, outW, outH)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outW, outH, config.showGrid, config.gridSize])

  return (
    <div className={styles.wrapper}>
      {/* Header info */}
      <div className={styles.info}>
        <span className={styles.filename} title={item.file.name}>{item.file.name}</span>
        <span className={styles.dims}>
          {item.srcWidth}×{item.srcHeight}
          <span className={styles.arrow}>→</span>
          <span className={item.outputBlob ? styles.done : styles.pending}>
            {outW}×{outH}
          </span>
        </span>
      </div>

      {/* Canvas preview */}
      <div
        ref={wrapRef}
        className={styles.canvasWrap}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <canvas
          ref={canvasRef}
          className={styles.canvas}
          style={{
            imageRendering: 'pixelated',
            width:  outW * zoom,
            height: outH * zoom,
          }}
        />
        {/* Overlay enquanto processa */}
        {item.status === 'processing' && (
          <div className={styles.overlay}>
            <div className={styles.spinner} />
          </div>
        )}
        {item.status === 'error' && (
          <div className={`${styles.overlay} ${styles.overlayErr}`}>
            <span>⚠ {item.error}</span>
          </div>
        )}
      </div>

      {/* Zoom controls */}
      <div className={styles.zoomRow}>
        <label>Zoom Preview</label>
        <input
          type="range" min={1} max={16} step={1} value={zoom}
          onChange={e => setZoom(Number(e.target.value))}
        />
        <span className={styles.mono}>{zoom}×</span>
      </div>
    </div>
  )
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  size: GridSize
) {
  ctx.save()
  ctx.setLineDash([])

  // Gera todas as posições de linha: 0, size, 2*size, … até w/h inclusive
  const xs: number[] = []
  const ys: number[] = []
  for (let x = 0; x <= w; x += size) xs.push(x)
  for (let y = 0; y <= h; y += size) ys.push(y)
  // Garante que a borda final está sempre presente
  if (xs[xs.length - 1] !== w) xs.push(w)
  if (ys[ys.length - 1] !== h) ys.push(h)

  // -- Camada 1: sombra escura (deslocamento -0.5px) --
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)'
  ctx.lineWidth   = 1
  for (const x of xs) {
    ctx.beginPath(); ctx.moveTo(x - 0.5, 0); ctx.lineTo(x - 0.5, h); ctx.stroke()
  }
  for (const y of ys) {
    ctx.beginPath(); ctx.moveTo(0, y - 0.5); ctx.lineTo(w, y - 0.5); ctx.stroke()
  }

  // -- Camada 2: linha principal amarela de 1px --
  ctx.strokeStyle = 'rgba(255, 225, 0, 1)'
  ctx.lineWidth   = 1
  for (const x of xs) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
  }
  for (const y of ys) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }

  ctx.restore()
}
