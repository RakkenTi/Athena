import { updateElectronApp, UpdateSourceType } from 'update-electron-app'

export const startAutoUpdater = () => {
    updateElectronApp({
        updateSource: {
            type: UpdateSourceType.ElectronPublicUpdateService,
            repo: 'RakkenTi/Athena',
        },
        logger: console,
    })

    console.log('Auto updater started!')
}
