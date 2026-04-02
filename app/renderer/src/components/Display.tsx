// src/components/display.tsx
import { type Component } from 'solid-js'
import { ArchivesBar } from './ArchivesBar'
import { Feed } from './Feed'
import { FilterBar } from './FilterBar'

const Display: Component = () => (
    <div class="relative flex h-full w-full flex-col items-center justify-between gap-2 overflow-y-auto transition-all duration-100 lg:flex-row">
        <div class="z-10 order-1 h-full w-full md:block lg:max-w-xs">
            <ArchivesBar />
        </div>
        <div
            class={`order-3 h-full w-full overflow-clip overflow-y-auto lg:order-2 lg:max-w-4xl`}
        >
            <Feed />
        </div>
        <div class="z-10 order-2 h-full w-full text-center md:block lg:order-3 lg:max-w-xs lg:text-left">
            <FilterBar />
        </div>
    </div>
)

export default Display
