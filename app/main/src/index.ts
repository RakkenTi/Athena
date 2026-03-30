import { app } from 'electron'
import { CreateMainWindow } from './modules/Window'
import { setupApi } from './modules/IPCHandler'
import { SetupMenu } from './modules/Menu'
import { SetupSession } from './modules/Session'
import { registerProtocols } from './modules/Protocols'
import { attemptMigrateFile } from './modules/API'
import { startAutoUpdater } from './modules/Updater'

export const init = () => {
    setupApi()
    startAutoUpdater()

    attemptMigrateFile()

    registerProtocols()

    app.whenReady().then(() => {
        SetupMenu()
        SetupSession()
        CreateMainWindow()
    })

    app.once('window-all-closed', () => {
        app.quit()
    })

    app.once('quit', () => process.exit(0))
}
