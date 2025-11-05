import path from 'node:path'
import { dialog } from 'electron'

export type OpenDialogOptions = {
  title: string
  allowedExtensions?: string[]
}

export async function showOpenFileDialog({
  title,
  allowedExtensions = ['*']
}: OpenDialogOptions): Promise<string | null> {
  // Build a consistent filters array so every dialog offers the same extension list
  // and still exposes an "All Files" fallback when appropriate.
  const filters = buildFilters(allowedExtensions)
  const result = await dialog.showOpenDialog({
    title,
    properties: ['openFile'],
    filters
  })

  if (result.canceled || !result.filePaths.length) return null
  return result.filePaths[0]
}

export type SaveDialogOptions = {
  title: string
  defaultName?: string
  extension?: string
}

export async function showSaveFileDialog({
  title,
  defaultName = 'untitled',
  extension
}: SaveDialogOptions): Promise<string | null> {
  // Normalize the extension so callers can pass "rodeo" or ".rodeo" interchangeably.
  const extensionWithoutDot = extension?.replace(/^\./, '')
  const defaultFilename = extensionWithoutDot
    ? `${defaultName}.${extensionWithoutDot}`
    : defaultName
  const result = await dialog.showSaveDialog({
    title,
    defaultPath: path.join(process.cwd(), defaultFilename),
    filters: extensionWithoutDot
      ? [{ name: extensionWithoutDot.toUpperCase(), extensions: [extensionWithoutDot] }]
      : undefined
  })

  if (result.canceled || !result.filePath) return null
  // Ensure newly created files always include the target extension so later lookups
  // stay reliable. For instance, we always saves tourneys with .rodeo extension regardless
  // if the user includes it or not.
  return ensureExtension(result.filePath, extensionWithoutDot)
}

function buildFilters(extensions: string[]) {
  if (extensions.includes('*')) {
    return [{ name: 'All Files', extensions: ['*'] }]
  }
  return [
    {
      name: extensions.length === 1 ? extensions[0].toUpperCase() : 'Allowed Files',
      extensions
    },
    { name: 'All Files', extensions: ['*'] }
  ]
}

function ensureExtension(filePath: string, extension?: string) {
  if (!extension) return filePath
  const hasExtension = path.extname(filePath).toLowerCase() === `.${extension}`
  return hasExtension ? filePath : `${filePath}.${extension}`
}
