import { BrowserWindow } from 'electron'
import { BrowserWindowOptions } from './Window'

export const SetChildWindowProperties = (window: BrowserWindow) => {
    window.webContents.setWindowOpenHandler(() => {
        return {
            action: 'allow',
            overrideBrowserWindowOptions: (() => {
                return {
                    ...BrowserWindowOptions,
                    frame: true,
                    titleBarStyle: 'default',
                }
            })(),
        }
    })
}
