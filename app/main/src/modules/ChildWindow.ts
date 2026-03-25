import { BrowserWindow } from 'electron'
import { BrowserWindowOptions } from './Window'

export const SetChildWindowProperties = (window: BrowserWindow) => {
    window.webContents.setWindowOpenHandler(({ url }) => {
        return {
            action: 'allow',
            overrideBrowserWindowOptions: (() => {
                const options = { ...BrowserWindowOptions }
                options.frame = true
                return options
            })(),
        }
    })
}
