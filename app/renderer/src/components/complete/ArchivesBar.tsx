import { For, type Component } from 'solid-js'
import { InputFrame } from '../barebone/InputFrame'
import {
    archives,
    createArchive,
    defaultArchiveId,
    type ArchiveId,
} from '../../modules/data'
import { Archive } from './Archive'

export const ArchivesBar: Component = () => {
    const addArchive = (
        event: KeyboardEvent & { currentTarget: HTMLInputElement },
    ) => {
        if (event.key !== 'Enter') return

        const newArchiveName: string = event.currentTarget.value
            .trim()
            .toUpperCase()
        const success = createArchive(newArchiveName)
        if (!success) return
        event.currentTarget.value = ''
    }

    return (
        <div class="bg-element flex flex-col gap-4 rounded-xl p-4 transition-all duration-300">
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
            <For each={Object.entries(archives())}>
                {([archiveId]) =>
                    archiveId === defaultArchiveId ? (
                        <></>
                    ) : (
                        <Archive archiveId={archiveId as ArchiveId} />
                    )
                }
            </For>
        </div>
    )
}
