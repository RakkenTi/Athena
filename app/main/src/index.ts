import { app } from 'electron'
import { CreateWindow as CreateMainWindow } from './modules/Window'
import { handleApi as setupApi } from './modules/IPCHandler'
import { SetupMenu } from './modules/Menu'
import { SetupSession } from './modules/Session'
import { registerProtocols } from './modules/Protocols'
import { attemptMigrateFile } from './modules/API'
import { updateElectronApp, UpdateSourceType } from 'update-electron-app'

export const init = () => {
    updateElectronApp({
        updateSource: {
            type: UpdateSourceType.ElectronPublicUpdateService,
            repo: 'RakkenTi/Athena',
        },
    })
    attemptMigrateFile()

    registerProtocols()
    setupApi()

    app.setName('athena')
    app.setAppLogsPath()

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
