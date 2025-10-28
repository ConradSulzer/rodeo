import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { NewPlayer, PatchPlayer } from '@core/players/players'
import { NewScoreable, PatchScoreable } from '@core/tournaments/scoreables'
import { NewCategory, PatchCategory } from '@core/tournaments/categories'
import { NewDivision, PatchDivision } from '@core/tournaments/divisions'

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
  categories: {
    create: (data: NewCategory) => ipcRenderer.invoke('categories:create', data),
    update: (id: string, data: PatchCategory) => ipcRenderer.invoke('categories:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('categories:delete', id),
    get: (id: string) => ipcRenderer.invoke('categories:get', id),
    list: () => ipcRenderer.invoke('categories:list'),
    addScoreable: (categoryId: string, scoreableId: string) =>
      ipcRenderer.invoke('categories:addScoreable', categoryId, scoreableId),
    removeScoreable: (categoryId: string, scoreableId: string) =>
      ipcRenderer.invoke('categories:removeScoreable', categoryId, scoreableId),
    listScoreableIds: (categoryId: string) =>
      ipcRenderer.invoke('categories:listScoreableIds', categoryId),
    listForScoreable: (scoreableId: string) =>
      ipcRenderer.invoke('categories:listForScoreable', scoreableId)
  },
  divisions: {
    create: (data: NewDivision) => ipcRenderer.invoke('divisions:create', data),
    update: (id: string, data: PatchDivision) => ipcRenderer.invoke('divisions:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('divisions:delete', id),
    get: (id: string) => ipcRenderer.invoke('divisions:get', id),
    list: () => ipcRenderer.invoke('divisions:list'),
    addCategory: (divisionId: string, categoryId: string) =>
      ipcRenderer.invoke('divisions:addCategory', divisionId, categoryId),
    removeCategory: (divisionId: string, categoryId: string) =>
      ipcRenderer.invoke('divisions:removeCategory', divisionId, categoryId),
    listCategoryIds: (divisionId: string) =>
      ipcRenderer.invoke('divisions:listCategoryIds', divisionId),
    listForCategory: (categoryId: string) =>
      ipcRenderer.invoke('divisions:listForCategory', categoryId)
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
