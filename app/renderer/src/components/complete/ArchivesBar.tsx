import { For, type Component } from 'solid-js'
import { InputFrame } from '../barebone/InputFrame'
import {
    archives,
    defaultArchive,
    selectedArchive,
    setArchives,
    setSelectedArchive,
} from '../../modules/data'

export const ArchivesBar: Component = () => {
    const addArchive = (
        event: KeyboardEvent & { currentTarget: HTMLInputElement },
    ) => {
        if (event.key !== 'Enter') return

        const name = event.currentTarget.value.trim().toUpperCase()
        if (!name || archives().includes(name) || name == defaultArchive) return

        setArchives((prev) => [...prev, name])
        event.currentTarget.value = ''
    }

    return (
        <div class="bg-element flex flex-col gap-4 rounded-xl p-4 transition-all duration-100">
            <span class="text-sub text-xs font-bold tracking-widest">
                Archives
            </span>
            <InputFrame
                onKeyDown={addArchive}
                type="text"
                placeholder="Create New Archive"
                label="Create"
                id="CreateArchive"
            />
            <For each={archives()}>
                {(archiveName) => {
                    return (
                        <button
                            onClick={() => {
                                if (selectedArchive() === archiveName)
                                    return setSelectedArchive(undefined)
                                setSelectedArchive(archiveName)
                            }}
                            class={`group ${selectedArchive() === archiveName ? 'bg-highlight shadow-highlight shadow-md' : ''} hover:bg-highlight flex items-center gap-2 rounded-xl px-4 transition-all duration-200 hover:scale-105 hover:cursor-pointer`}
                        >
                            <div
                                class={`h-1.5 w-1.5 rounded-full transition-all ${
                                    selectedArchive() === archiveName
                                        ? 'bg-highlight-alt scale-125'
                                        : 'bg-element-accent'
                                }`}
                            />
                            <div class="p-2 text-left text-sm font-bold tracking-widest">
                                {archiveName}
                            </div>
                        </button>
                    )
                }}
            </For>
        </div>
    )
}
