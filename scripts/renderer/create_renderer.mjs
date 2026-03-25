import { execSync } from 'node:child_process'
import { existsSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const __dirname = import.meta.dirname
const RENDERER_PATH = join(__dirname, '../../app/renderer')
const PACKAGE_JSON_PATH = join(RENDERER_PATH, 'package.json')

function createRenderer() {
    if (existsSync(RENDERER_PATH)) {
        rmSync(RENDERER_PATH, { recursive: true, force: true })
    }
    execSync(`npm create vite@latest renderer -- --no-immediate`, {
        stdio: 'inherit',
        cwd: join(RENDERER_PATH, '../'),
    })
}

function updateRenderer() {
    if (!existsSync(RENDERER_PATH)) {
        return console.error(
            'No renderer created! Try to create it again. Unable to set defaults.',
        )
    }

    const packageJson = JSON.parse(
        readFileSync(join(RENDERER_PATH, 'package.json')),
    )

    console.log('Package.json:', packageJson)

    packageJson.name = '@app/renderer'
    savePackageJson(packageJson)
}

function savePackageJson(data) {
    writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(data, null, 4))
}

try {
    createRenderer()
    console.log('Successfully created renderer.')
    try {
        updateRenderer()
    } catch (error) {
        console.error(`Failed to update renderer package.json`)
        console.error(`Error:`, error.message)
        process.exit(1)
    }
} catch (error) {
    console.error('Failed to create new renderer.')
    console.error(`Error:`, error.message)
    process.exit(1)
}
