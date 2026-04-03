// src/components/display.tsx
import { type Component } from 'solid-js'
import { ArchivesBar } from './ArchivesBar'
import { Feed } from './Feed'
import { FilterBar } from './FilterBar'

const Display: Component = () => (
    <div class="relative flex h-[95%] w-full flex-col items-center justify-between gap-2 overflow-y-auto transition-all duration-100 lg:flex-row lg:overflow-hidden">
        <div class="z-10 order-1 w-full md:block lg:h-full lg:max-w-xs">
            <ArchivesBar />
        </div>
        <div
            class={`order-3 max-h-screen w-full max-w-full lg:order-2 lg:h-full lg:max-w-4xl lg:overflow-y-auto`}
        >
            <Feed />
        </div>
        <div class="z-10 order-2 w-full text-center md:block lg:order-3 lg:h-full lg:max-w-xs lg:text-left">
            <FilterBar />
        </div>
    </div>
)

export default Display
