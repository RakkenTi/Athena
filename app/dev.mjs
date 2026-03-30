import { execSync } from 'node:child_process'

const startRenderer = 'npm run dev:renderer'
const watchMain = 'npm run dev:watch'

try {
    execSync(
        `concurrently --kill-others --success first -n Main,Renderer -c blue,magenta \"${watchMain}\" \"${startRenderer}\" `,
        {
            stdio: 'inherit',
            shell: true,
        },
    )
} catch {
    process.exit(0)
}
