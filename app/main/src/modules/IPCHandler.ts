import { ipcMain } from 'electron'
import { Api } from './API'

export const handleApi = () => {
    const entries = Object.entries(Api) as Array<
        [string, (...args: any[]) => any]
    >
    for (const [key, value] of entries) {
        console.log(`Registering IPC ${key}`)
        ipcMain.handle(key, (_, ...args) => {
            return value(...args)
        })
    }
}
