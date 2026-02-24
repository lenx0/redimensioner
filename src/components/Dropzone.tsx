import { useRef, useState, type DragEvent } from 'react'
import type { ImageItem } from '../types'
import { getImageDimensions, getImageURL } from '../utils/pixelResize'
import styles from './Dropzone.module.css'

const ACCEPTED = ['image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/jpeg']

interface Props {
  onAdd: (items: ImageItem[]) => void
}

export default function Dropzone({ onAdd }: Props) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function processFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => ACCEPTED.includes(f.type))
    if (!arr.length) return

    const items = await Promise.all(
      arr.map(async (file): Promise<ImageItem> => {
        const { width, height } = await getImageDimensions(file)
        return {
          id: `${file.name}-${Date.now()}-${Math.random()}`,
          file,
          previewUrl: getImageURL(file),
          srcWidth: width,
          srcHeight: height,
          status: 'pending',
        }
      })
    )
    onAdd(items)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length) processFiles(e.dataTransfer.files)
  }

  return (
    <div
      className={`${styles.zone} ${dragging ? styles.active : ''}`}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED.join(',')}
        style={{ display: 'none' }}
        onChange={e => e.target.files && processFiles(e.target.files)}
      />
      <div className={styles.icon}>🎮</div>
      <p className={styles.label}>Arraste imagens de pixel art aqui</p>
      <p className={styles.sub}>ou clique para selecionar • PNG, GIF, BMP, WebP, JPEG</p>
    </div>
  )
}
