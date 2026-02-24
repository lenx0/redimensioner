import type { ImageItem, ResizeConfig } from '../types'
import { computeOutDims } from '../utils/dimsCalc'
import ImagePreview from './ImagePreview'
import styles from './BatchList.module.css'

interface Props {
  items: ImageItem[]
  config: ResizeConfig
  onRemove: (id: string) => void
  onSelect: (id: string) => void
  selectedId: string | null
}

const STATUS_ICON: Record<ImageItem['status'], string> = {
  pending:    '⏸',
  processing: '⏳',
  done:       '✅',
  error:      '⚠',
}

export default function BatchList({ items, config, onRemove, onSelect, selectedId }: Props) {
  if (!items.length) return null

  const selected = items.find(i => i.id === selectedId) ?? items[0]

  return (
    <div className={styles.root}>
      {/* Lista lateral */}
      <div className={styles.list}>
        {items.map(item => {
          const { w: outW, h: outH } = computeOutDims(item.srcWidth, item.srcHeight, config)
          return (
            <div
              key={item.id}
              className={`${styles.row} ${item.id === selectedId ? styles.selected : ''}`}
              onClick={() => onSelect(item.id)}
            >
              <img
                src={item.previewUrl}
                className={styles.thumb}
                alt={item.file.name}
                style={{ imageRendering: 'pixelated' }}
              />
              <div className={styles.rowInfo}>
                <span className={styles.rowName}>{item.file.name}</span>
                <span className={styles.rowDims}>
                  {item.srcWidth}×{item.srcHeight} → {outW}×{outH}
                </span>
              </div>
              <span className={styles.rowStatus} data-status={item.status}>
                {STATUS_ICON[item.status]}
              </span>
              <button
                className={styles.removeBtn}
                onClick={e => { e.stopPropagation(); onRemove(item.id) }}
                title="Remover"
              >×</button>
            </div>
          )
        })}
      </div>

      {/* Preview principal */}
      <div className={styles.preview}>
        <ImagePreview item={selected} config={config} />
      </div>
    </div>
  )
}
