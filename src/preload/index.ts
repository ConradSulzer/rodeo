import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { NewPlayer, PatchPlayer } from '@core/players/players'
import { NewScoreable, PatchScoreable } from '@core/tournaments/scoreables'

// Custom APIs for renderer
const api = {
  players: {
    create: (data: NewPlayer) => ipcRenderer.invoke('players:create', data),
    update: (id: string, data: PatchPlayer) => ipcRenderer.invoke('players:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('players:delete', id),
    get: (id: string) => ipcRenderer.invoke('players:get', id),
    list: () => ipcRenderer.invoke('players:list')
  },
  scoreables: {
    create: (data: NewScoreable) => ipcRenderer.invoke('scoreables:create', data),
    update: (id: string, data: PatchScoreable) => ipcRenderer.invoke('scoreables:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('scoreables:delete', id),
    get: (id: string) => ipcRenderer.invoke('scoreables:get', id),
    list: () => ipcRenderer.invoke('scoreables:list')
  },
  tournaments: {
    open: (filePath: string) => ipcRenderer.invoke('tournaments:open', filePath),
    close: () => ipcRenderer.invoke('tournaments:close')
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
