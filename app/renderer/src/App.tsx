// src/App.tsx
import { type Component } from 'solid-js'
import './App.css'
import './index.css'
import { Line } from './components/Line'
import { TagBar } from './components/TagBar'
import Display from './components/Display'
import { Modals } from './components/Modals'
import * as json from '../../../package.json'

const App: Component = () => (
    <>
        <Modals />
        <div class="bg-background text-main flex h-screen flex-col">
            <header
                style="-webkit-app-region: drag"
                class="bg-element m-0 flex shrink-0 items-center justify-center py-2"
            >
                <h1 class="text-2xl font-black tracking-tight">
                    Athena v{json.version}
                </h1>
            </header>
            <Line class="bg-element-accent h-0.5 w-full" />
            <TagBar />
            <div class="flex flex-1 justify-center overflow-hidden pt-6">
                <div class="h-full w-[95%]">
                    <Display />
                </div>
            </div>
        </div>
    </>
)

export default App
