import { autoUpdater } from 'electron'
import { updateElectronApp, UpdateSourceType } from 'update-electron-app'

export const startAutoUpdater = () => {
    autoUpdater.on('error', (error) => {
        console.error('Update Error:', error)
    })

    autoUpdater.on('checking-for-update', () => {
        console.log('Checking for update...')
    })

    autoUpdater.on('update-available', () => {
        console.log('Update available!')
    })

    autoUpdater.on('update-not-available', () => {
        console.log('Update not available. Current version:')
    })

    updateElectronApp({
        updateSource: {
            type: UpdateSourceType.ElectronPublicUpdateService,
            repo: 'athenaeum-app/athena-client',
        },
        logger: console,
    })

    console.log('Auto updater started!')
}
