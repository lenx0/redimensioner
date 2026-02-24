/**
 * Utilitários para salvar arquivos usando a File System Access API
 * (suportado em Chrome/Edge). Faz fallback para link de download automático.
 */

export async function pickOutputDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!('showDirectoryPicker' in window)) return null
  try {
    return await (window as unknown as { showDirectoryPicker: () => Promise<FileSystemDirectoryHandle> }).showDirectoryPicker()
  } catch {
    return null
  }
}

export async function saveFileToDirectory(
  dirHandle: FileSystemDirectoryHandle,
  filename: string,
  blob: Blob
): Promise<void> {
  const fileHandle = await dirHandle.getFileHandle(filename, { create: true })
  const writable   = await fileHandle.createWritable()
  await writable.write(blob)
  await writable.close()
}

/** Fallback: download via <a> */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export function buildOutputFilename(original: string, width: number, height: number): string {
  const dot  = original.lastIndexOf('.')
  const base = dot !== -1 ? original.slice(0, dot) : original
  const ext  = dot !== -1 ? original.slice(dot)    : '.png'
  return `${base}_${width}x${height}${ext}`
}

export const hasDirectoryPicker = () => 'showDirectoryPicker' in window
