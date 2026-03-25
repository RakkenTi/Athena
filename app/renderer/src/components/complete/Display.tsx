// src/components/display.tsx
import { type Component } from 'solid-js'
import { ArchivesBar } from './ArchivesBar'
import { Feed } from './Feed'
import { FilterBar } from './FilterBar'

const Display: Component = () => (
    <div class="relative flex h-full w-full justify-between transition-all duration-100">
        <div class="z-10 hidden h-full w-full max-w-xs sm:block">
            <ArchivesBar />
        </div>
        <div class="h-full w-full max-w-4xl px-4">
            <Feed />
        </div>
        <div class="z-10 hidden h-full w-full max-w-xs md:block">
            <FilterBar />
        </div>
    </div>
)

export default Display
