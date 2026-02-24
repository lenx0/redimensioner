import { useCallback } from 'react'
import type { GridSize, ResizeConfig, ImageItem } from '../types'
import { computeOutDims } from '../utils/dimsCalc'
import styles from './ResizeControls.module.css'

const PERCENT_PRESETS = [10, 25, 33, 50, 66, 75, 100, 150, 200] as const
const GRID_SIZES: { label: string; value: GridSize }[] = [
  { label: 'Sem grade', value: 0   },
  { label: '8x8',       value: 8   },
  { label: '16x16',     value: 16  },
  { label: '32x32',     value: 32  },
  { label: '64x64',     value: 64  },
  { label: '128x128',   value: 128 },
]

interface Props {
  config: ResizeConfig
  onChange: (c: Partial<ResizeConfig>) => void
  onProcess: () => void
  onSaveAll: () => void
  onPickFolder: () => void
  outputFolder: string | null
  processing: boolean
  hasResults: boolean
  hasImages: boolean
  selectedItem: ImageItem | null
}

export default function ResizeControls({
  config, onChange, onProcess, onSaveAll, onPickFolder,
  outputFolder, processing, hasResults, hasImages, selectedItem,
}: Props) {

  const aspectRatio = selectedItem
    ? selectedItem.srcWidth / selectedItem.srcHeight
    : null

  const handleExactWidth = useCallback((raw: string) => {
    const v = raw === '' ? ('' as const) : Math.max(1, parseInt(raw, 10) || 1)
    if (config.lockAspect && v !== '' && aspectRatio) {
      onChange({ exactWidth: v, exactHeight: Math.max(1, Math.round((v as number) / aspectRatio)) })
    } else {
      onChange({ exactWidth: v })
    }
  }, [config.lockAspect, aspectRatio, onChange])

  const handleExactHeight = useCallback((raw: string) => {
    const v = raw === '' ? ('' as const) : Math.max(1, parseInt(raw, 10) || 1)
    if (config.lockAspect && v !== '' && aspectRatio) {
      onChange({ exactHeight: v, exactWidth: Math.max(1, Math.round((v as number) * aspectRatio)) })
    } else {
      onChange({ exactHeight: v })
    }
  }, [config.lockAspect, aspectRatio, onChange])

  const resultDims = selectedItem
    ? computeOutDims(selectedItem.srcWidth, selectedItem.srcHeight, config)
    : null

  return (
    <div className={styles.panel}>
      <h2 className={styles.title}>Configuracoes</h2>

      <section className={styles.section}>
        <label className={styles.label}>Modo de reducao</label>
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeBtn} ${config.scaleMode === 'percent' ? styles.modeActive : ''}`}
            onClick={() => onChange({ scaleMode: 'percent' })}
          >
            % Percentual
          </button>
          <button
            className={`${styles.modeBtn} ${config.scaleMode === 'pixels' ? styles.modeActive : ''}`}
            onClick={() => onChange({ scaleMode: 'pixels' })}
          >
            px Pixels
          </button>
        </div>

        {config.scaleMode === 'percent' && (
          <>
            <div className={styles.presetRow}>
              {PERCENT_PRESETS.map(p => (
                <button
                  key={p}
                  className={`${styles.preset} ${config.scale === p ? styles.active : ''}`}
                  onClick={() => onChange({ scale: p })}
                >
                  {p}%
                </button>
              ))}
            </div>

            <div className={styles.sliderRow}>
              <input
                type="range" min={1} max={200} step={1}
                value={config.scale}
                onChange={e => onChange({ scale: Number(e.target.value) })}
              />
              <input
                type="number" min={1} max={200}
                className={styles.numInput}
                value={config.scale}
                onChange={e => {
                  const v = Math.max(1, Math.min(200, Number(e.target.value) || 1))
                  onChange({ scale: v })
                }}
              />
              <span className={styles.unit}>%</span>
            </div>
          </>
        )}

        {config.scaleMode === 'pixels' && (
          <>
            <div className={styles.pixelGrid}>
              <label className={styles.dimLabel}>Largura (px)</label>
              <label className={styles.dimLabel}>Altura (px)</label>
              <input
                type="number" min={1} placeholder="auto"
                className={styles.numInput}
                value={config.exactWidth}
                onChange={e => handleExactWidth(e.target.value)}
              />
              <input
                type="number" min={1} placeholder="auto"
                className={styles.numInput}
                value={config.exactHeight}
                onChange={e => handleExactHeight(e.target.value)}
              />
            </div>

            <label className={styles.lockRow}>
              <input
                type="checkbox"
                checked={config.lockAspect}
                disabled={!aspectRatio}
                onChange={e => onChange({ lockAspect: e.target.checked })}
              />
              <span className={!aspectRatio ? styles.muted : ''}>
                Manter proporcao{!aspectRatio ? ' (carregue uma imagem)' : ''}
              </span>
            </label>

            {!config.exactWidth && !config.exactHeight && (
              <p className={styles.hint}>
                Deixe em branco para usar a escala percentual como fallback
              </p>
            )}
          </>
        )}

        {resultDims && selectedItem && (
          <div className={styles.resultBox}>
            <span className={styles.resultSrc}>{selectedItem.srcWidth}x{selectedItem.srcHeight}</span>
            <span className={styles.resultArrow}>&rarr;</span>
            <span className={`${styles.resultOut} ${resultDims.snapped ? styles.resultSnapped : ''}`}>
              {resultDims.w}x{resultDims.h}
            </span>
            <span className={styles.resultPx}>px</span>
            {resultDims.snapped && <span className={styles.snapBadge}>snap ✓</span>}
          </div>
        )}
      </section>

      <section className={styles.section}>
        <label className={styles.label}>Grade no preview</label>
        <select
          value={config.gridSize}
          onChange={e => onChange({
            gridSize: Number(e.target.value) as GridSize,
            showGrid: Number(e.target.value) > 0,
            snapToGrid: Number(e.target.value) === 0 ? false : config.snapToGrid,
          })}
        >
          {GRID_SIZES.map(g => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>

        <label className={styles.lockRow}>
          <input
            type="checkbox"
            checked={config.snapToGrid}
            disabled={config.gridSize === 0}
            onChange={e => onChange({ snapToGrid: e.target.checked })}
          />
          <span className={config.gridSize === 0 ? styles.muted : styles.snapLabel}>
            Alinhar saída ao grid (evita tiles distorcidos)
          </span>
        </label>

        {config.snapToGrid && config.gridSize > 0 && resultDims?.snapped && (
          <p className={styles.snapWarning}>
            ⚠ Dimensões ajustadas para múltiplo de {config.gridSize}px
          </p>
        )}

        <p className={styles.hint}>Visualize as celulas de tiles sobre a imagem</p>
      </section>

      <section className={styles.section}>
        <label className={styles.label}>Pasta de saida</label>
        <div className={styles.folderRow}>
          <button className={styles.btnSecondary} onClick={onPickFolder}>
            Escolher pasta
          </button>
          <span className={styles.folderName}>
            {outputFolder ?? <em className={styles.muted}>download automatico</em>}
          </span>
        </div>
      </section>

      <div className={styles.actions}>
        <button
          className={styles.btnPrimary}
          disabled={!hasImages || processing}
          onClick={onProcess}
        >
          {processing ? 'Processando...' : 'Redimensionar'}
        </button>
        <button
          className={styles.btnSuccess}
          disabled={!hasResults || processing}
          onClick={onSaveAll}
        >
          Salvar tudo
        </button>
      </div>
    </div>
  )
}
