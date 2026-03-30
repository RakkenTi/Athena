import { app } from 'electron'
app.setName('athena') // KEEP AT TOP sets the name for app.getPath(), etc
app.setAppLogsPath()

import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)

if (require('electron-squirrel-startup')) {
    app.quit()
}

const { init } = await import('./main/dist/index.js')
console.log('Attempting to start app.')
init()
