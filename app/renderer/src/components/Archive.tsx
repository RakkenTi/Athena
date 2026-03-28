import {
    createEffect,
    createMemo,
    createSignal,
    onMount,
    Show,
    type Component,
    type ComponentProps,
} from 'solid-js'
import {
    archives,
    defaultArchiveId,
    deleteArchive,
    selectedArchiveId,
    setSelectedArchive,
    updateArchive,
    type ArchiveId,
} from '../modules/data'
import { iconClasses } from '../modules/globals'

export const Archive: Component<
    ComponentProps<'button'> & { archiveId: ArchiveId }
> = (props) => {
    let bufferNameRef: HTMLInputElement | undefined

    const archiveName = createMemo(() => {
        return archives()?.[props.archiveId]?.name
    })

    const [isConfirmingDelete, setIsConfirmingDelete] =
        createSignal<boolean>(false)
    const [isEditing, setIsEditing] = createSignal<boolean>(false)
    const [bufferName, setBufferName] = createSignal<string>('')

    onMount(() => {
        createEffect(() => {
            if (isEditing()) {
                bufferNameRef?.focus()
            }
        })
    })

    return (
        <button
            onClick={() => {
                if (selectedArchiveId() === props.archiveId)
                    return setSelectedArchive(defaultArchiveId)
                setSelectedArchive(props.archiveId)
            }}
            class={`group flex justify-between ${selectedArchiveId() === props.archiveId ? 'bg-highlight shadow-highlight shadow-md' : ''} hover:bg-highlight flex items-center gap-2 rounded-xl px-4 transition-all duration-200 hover:scale-105 hover:cursor-pointer`}
        >
            <div class="flex items-center gap-2">
                <div
                    class={`h-1.5 w-1.5 rounded-full transition-all ${
                        selectedArchiveId() === props.archiveId
                            ? 'bg-highlight-strongest scale-125'
                            : 'bg-element-accent'
                    }`}
                />
                <Show
                    when={!isEditing()}
                    fallback={
                        <input
                            ref={bufferNameRef}
                            type="text"
                            value={bufferName()}
                            onInput={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setBufferName(
                                    e.currentTarget.value.trim().toUpperCase(),
                                )
                            }}
                            onFocusOut={() => {
                                setIsEditing(false)
                                setBufferName(archiveName())
                            }}
                            onKeyDown={(e) => {
                                e.stopPropagation()
                                if (e.key == 'Enter') {
                                    const newName = bufferName().toUpperCase()
                                    if (newName.trim() != '') {
                                        updateArchive(props.archiveId, {
                                            name: newName,
                                        })
                                    }
                                    setIsEditing(false)
                                }
                                if (e.key == 'Escape') {
                                    setIsEditing(false)
                                    setBufferName(archiveName())
                                }
                            }}
                            class="w-full p-2 text-left text-sm font-bold tracking-widest outline-none"
                        />
                    }
                >
                    <div class="w-full p-2 text-left text-sm font-bold tracking-widest">
                        {archiveName()}
                    </div>
                </Show>
            </div>
            <Show when={!isEditing()}>
                <div class="flex items-center gap-2 opacity-0 transition-all duration-300 group-hover:opacity-100">
                    <i
                        class={iconClasses + 'fa-pencil'}
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            setIsEditing(!isEditing())
                            setBufferName(archiveName())
                        }}
                    />
                    <i
                        class={
                            iconClasses +
                            `${isConfirmingDelete() ? 'fa-check' : 'fa-trash'}`
                        }
                        onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            if (isConfirmingDelete()) {
                                setIsConfirmingDelete(false)
                                deleteArchive(props.archiveId)
                            } else {
                                setIsConfirmingDelete(true)
                            }
                        }}
                    />
                </div>
            </Show>
        </button>
    )
}
