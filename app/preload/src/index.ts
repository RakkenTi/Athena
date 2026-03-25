import { IpcApi } from '../../main/src/types/APISchema'
import { contextBridge, ipcRenderer } from 'electron'

const bridge: Record<string, any> = {}

Object.keys(IpcApi).forEach((key) => {
    console.log(`Preload registering ${key}`)
    bridge[key] = (...args: any[]) => ipcRenderer.invoke(key, ...args)
})

contextBridge.exposeInMainWorld('api', bridge)
