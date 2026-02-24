import { useState, useCallback } from 'react'
import type { ImageItem, ResizeConfig } from './types'
import Dropzone from './components/Dropzone'
import BatchList from './components/BatchList'
import ResizeControls from './components/ResizeControls'
import { resizePixelArt } from './utils/pixelResize'
import { computeOutDims } from './utils/dimsCalc'
import {
  pickOutputDirectory, saveFileToDirectory,
  downloadBlob, buildOutputFilename, hasDirectoryPicker,
} from './utils/fileSave'
import styles from './App.module.css'

const DEFAULT_CONFIG: ResizeConfig = {
  scaleMode: 'percent',
  scale: 50,
  exactWidth: '',
  exactHeight: '',
  lockAspect: true,
  snapToGrid: false,
  gridSize: 32,
  showGrid: true,
  previewFit: 'fit',
}

export default function App() {
  const [images, setImages]           = useState<ImageItem[]>([])
  const [config, setConfig]           = useState<ResizeConfig>(DEFAULT_CONFIG)
  const [selectedId, setSelectedId]   = useState<string | null>(null)
  const [processing, setProcessing]   = useState(false)
  const [outputFolder, setOutputFolder] = useState<FileSystemDirectoryHandle | null>(null)

  /* ── Adicionar imagens ── */
  const handleAdd = useCallback((items: ImageItem[]) => {
    setImages(prev => {
      const all = [...prev, ...items]
      if (!selectedId) setSelectedId(all[0]?.id ?? null)
      return all
    })
    if (!selectedId) setSelectedId(items[0]?.id ?? null)
  }, [selectedId])

  /* ── Remover ── */
  const handleRemove = useCallback((id: string) => {
    setImages(prev => {
      const next = prev.filter(i => i.id !== id)
      if (selectedId === id) setSelectedId(next[0]?.id ?? null)
      return next
    })
  }, [selectedId])

  /* ── Alterar config ── */
  const handleConfig = useCallback((partial: Partial<ResizeConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }))
  }, [])

  /* ── Processar todas as imagens ── */
  const handleProcess = useCallback(async () => {
    if (!images.length) return
    setProcessing(true)

    // Marca todas como processing
    setImages(prev => prev.map(i => ({ ...i, status: 'processing', outputBlob: undefined })))

    const results = await Promise.allSettled(
      images.map(async (item): Promise<ImageItem> => {
        try {
          const { w, h } = computeOutDims(item.srcWidth, item.srcHeight, config)
          const { blob, width, height } = await resizePixelArt(item.file, 1, w, h)
          return {
            ...item,
            status: 'done',
            outputBlob: blob,
            outputWidth: width,
            outputHeight: height,
          }
        } catch (err) {
          return {
            ...item,
            status: 'error',
            error: err instanceof Error ? err.message : 'Erro desconhecido',
          }
        }
      })
    )

    setImages(
      results.map(r => (r.status === 'fulfilled' ? r.value : r.reason as ImageItem))
    )
    setProcessing(false)
  }, [images, config.scale])

  /* ── Salvar tudo ── */
  const handleSaveAll = useCallback(async () => {
    const done = images.filter(i => i.status === 'done' && i.outputBlob)
    if (!done.length) return

    for (const item of done) {
      const name = buildOutputFilename(
        item.file.name,
        item.outputWidth!,
        item.outputHeight!
      )
      if (outputFolder) {
        await saveFileToDirectory(outputFolder, name, item.outputBlob!)
      } else {
        downloadBlob(item.outputBlob!, name)
      }
    }
  }, [images, outputFolder])

  /* ── Escolher pasta ── */
  const handlePickFolder = useCallback(async () => {
    if (!hasDirectoryPicker()) {
      alert('Seu navegador não suporta seleção de pasta.\nOs arquivos serão baixados automaticamente.')
      return
    }
    const handle = await pickOutputDirectory()
    if (handle) setOutputFolder(handle)
  }, [])

  const hasResults = images.some(i => i.status === 'done')
  const selectedItem = images.find(i => i.id === selectedId) ?? images[0] ?? null

  return (
    <div className={styles.app}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoIcon}>🎮</span>
          <span className={styles.logoText}>Redimensioner</span>
          <span className={styles.logoBadge}>Pixel Art</span>
        </div>
        <p className={styles.tagline}>
          Redimensiona pixel art <strong>sem esmagar os pixels</strong> — nearest-neighbor puro
        </p>
      </header>

      {/* Main layout */}
      <main className={styles.main}>
        {/* Coluna esquerda: controls */}
        <aside className={styles.sidebar}>
          <ResizeControls
            config={config}
            onChange={handleConfig}
            onProcess={handleProcess}
            onSaveAll={handleSaveAll}
            onPickFolder={handlePickFolder}
            outputFolder={outputFolder?.name ?? null}
            processing={processing}
            hasResults={hasResults}
            hasImages={images.length > 0}
            selectedItem={selectedItem}
          />
        </aside>

        {/* Coluna direita: drop + lista */}
        <section className={styles.content}>
          <Dropzone onAdd={handleAdd} />

          {images.length > 0 && (
            <BatchList
              items={images}
              config={config}
              onRemove={handleRemove}
              onSelect={setSelectedId}
              selectedId={selectedId}
            />
          )}
        </section>
      </main>

      <footer className={styles.footer}>
        Interpolação Nearest-Neighbor • Canvas API • File System Access API
      </footer>
    </div>
  )
}
