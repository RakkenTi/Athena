import { BrowserWindow } from 'electron'
import { join } from 'node:path'
import { SetChildWindowProperties } from './ChildWindow'
const __dirname = import.meta.dirname

export const BrowserWindowOptions: Electron.BrowserWindowConstructorOptions = {
    title: 'Athena',
    width: 1200,
    minWidth: 700,
    height: 900,
    minHeight: 400,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
        color: '#00000000',
        symbolColor: '#94a3b8',
    },
    autoHideMenuBar: true,
    icon: join(__dirname, '../../../assets/icon.png'),
}

export const CreateWindow = async () => {
    const preloadPath = join(
        __dirname,
        '../',
        '../',
        'preload',
        'dist',
        'index.cjs',
    )

    console.log('App starting. Preload path:', preloadPath)

    const window = new BrowserWindow({
        ...BrowserWindowOptions,
        webPreferences: {
            preload: preloadPath,
            contextIsolation: true,
        },
    })

    window.maximize()

    const isDev = process.env.DEV

    if (isDev || process.argv.includes('--enable-devtools')) {
        window.webContents.openDevTools()
    }

    if (isDev) {
        console.log('Dev environment detected, loading local vite server.')
        window.loadURL('http://localhost:5173')
    } else {
        const path = join(
            __dirname,
            '../',
            '../',
            'renderer',
            'dist',
            'index.html',
        )
        console.log(
            'Production environment. Loading built renderer. Using path:',
            path,
        )
        window.loadFile(path)
    }

    SetChildWindowProperties(window)
    console.log('Created window!')
}
