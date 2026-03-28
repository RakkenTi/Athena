import { app, net, session } from 'electron'
import { resolve } from 'node:path'
import * as url from 'node:url'

const scheme = 'athena'
export const uriPrefix = scheme + '://'

export const SetupSession = () => {
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

    session.defaultSession.protocol.handle(scheme, (request) => {
        const appData = app.getPath('userData')
        const filePath = request.url.slice(uriPrefix.length)
        const fileURL = resolve(appData, 'attachments', filePath)
        console.log('URL: ', fileURL)
        return net.fetch(url.pathToFileURL(fileURL).toString())
    })
}
