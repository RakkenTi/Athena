import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    plugins: [solid(), tailwindcss()],
    base: './',
    server: {
        watch: {
            usePolling: true,
            interval: 10,
        },
        hmr: {
            overlay: true,
        },
    },
})
