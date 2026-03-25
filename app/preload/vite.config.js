import { defineConfig } from 'vite'
import { builtinModules } from 'node:module'

export default defineConfig({
    build: {
        ssr: true,
        target: 'node23',
        outDir: 'dist',
        assetsDir: '.',
        lib: {
            entry: 'src/index.ts',
            formats: ['cjs'],
        },
        emptyOutDir: true,
    },
})
