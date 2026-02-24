export type ProcessStatus = 'pending' | 'processing' | 'done' | 'error'

export interface ImageItem {
  id: string
  file: File
  previewUrl: string
  srcWidth: number
  srcHeight: number
  status: ProcessStatus
  outputBlob?: Blob
  outputWidth?: number
  outputHeight?: number
  error?: string
}

export type GridSize = 0 | 8 | 16 | 32 | 64 | 128

export type ScaleMode = 'percent' | 'pixels'

export interface ResizeConfig {
  scaleMode: ScaleMode
  scale: number          // 1–200 (percentual, modo 'percent')
  exactWidth:  number | ''   // modo 'pixels'
  exactHeight: number | ''   // modo 'pixels'
  lockAspect: boolean        // proporcional
  gridSize: GridSize
  showGrid: boolean
  previewFit: 'actual' | 'fit'
}
