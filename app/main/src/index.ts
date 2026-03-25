import { app, session } from 'electron'
import { CreateWindow } from './modules/Window'
import { handleApi as setupApi } from './modules/IPCHandler'

export const init = () => {
    if (require('electron-squirrel-startup')) app.quit()

    console.log('Waiting for app ready...')

    setupApi()

    app.name = 'Athena'

    app.whenReady().then(() => {
        console.log('App ready!')
        CreateWindow()

        session.defaultSession.webRequest.onBeforeSendHeaders(
            {
                urls: ['https://*.twimg.com/*', 'https://*.vxtwitter.com/*'],
            },
            (details, callback) => {
                delete details.requestHeaders['Origin']
                delete details.requestHeaders['Referer']
                details.requestHeaders['User-Agent'] = 'facebookexternalhit/1.1'
                callback({ requestHeaders: details.requestHeaders })
            },
        )

        session.defaultSession.webRequest.onBeforeSendHeaders(
            {
                urls: [
                    'https://www.youtube-nocookie.com/*',
                    'https://www.youtube.com/*',
                ],
            },
            (details, callback) => {
                details.requestHeaders['Referer'] = 'https://www.google.com/'
                details.requestHeaders['Origin'] = 'https://www.google.com'

                details.requestHeaders['User-Agent'] =
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

                callback({ requestHeaders: details.requestHeaders })
            },
        )
    })

    app.once('window-all-closed', () => {
        app.quit()
    })

    app.once('quit', () => process.exit(0))
}
