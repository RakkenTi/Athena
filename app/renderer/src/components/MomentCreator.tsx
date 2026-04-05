import {
    createEffect,
    createMemo,
    createSignal,
    For,
    onMount,
    Show,
    type Component,
    type ComponentProps,
} from 'solid-js'
import { Line } from './Line'
import {
    allMoments,
    allTags,
    archives,
    content,
    createMoment,
    defaultArchiveId,
    defaultArchiveName,
    editingMomentId,
    registerTags,
    saveFileReference,
    selectedArchiveId,
    setContent,
    setEditingMomentId,
    setTagsString,
    setTitle,
    swapMomentArchive,
    tagsString,
    title,
    updateMoment,
    type ArchiveId,
    type Tag,
} from '../modules/data'
import {
    displayedModal,
    displayedMomentModalId,
    iconClasses,
    setDisplayedModal,
    sortTags,
} from '../modules/globals'
import { getApi } from '../modules/ipc_client'

const textDisplayClasses =
    'col-start-1 row-start-1 h-auto max-h-96 min-h-12 w-full overflow-x-hidden overflow-y-auto border border-transparent px-2 py-1 font-sans text-sm leading-normal break-all whitespace-pre-wrap'

export const MomentCreator: Component<
    ComponentProps<'div'> & {
        hide?: boolean
    }
> = (props) => {
    let archiveInputRef: HTMLInputElement | undefined
    let textInputAreaRef: HTMLTextAreaElement | undefined // not visible
    let textDisplayRef: HTMLDivElement | undefined
    const [isPreviewing, setIsPreviewing] = createSignal<boolean>(false)

    onMount(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Control') setIsPreviewing(true)
        }
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Control') setIsPreviewing(false)
        }

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
        }
    })

    const getSuggestableTags = createMemo(() => {
        // retrieve
        const allTagDatas = Object.values(allTags)
        const currentTypedTags = tagsString()
            .split(',')
            .map((tag) => tag.toUpperCase().trim())
        const currentTypedTag = currentTypedTags[currentTypedTags.length - 1]

        const suggestedTags: Array<Tag> = []
        for (const tagData of allTagDatas) {
            if (
                tagData.name.startsWith(currentTypedTag) &&
                !currentTypedTags.includes(tagData.name)
            ) {
                suggestedTags.push(tagData)
            }
        }

        return sortTags(suggestedTags)
    })

    const cleanupCreator = () => {
        setTitle('')
        setContent('')
        setTagsString('')
    }

    const saveTags = () => {
        // Update tags
        const tagNameArray: Array<string> = [
            ...new Set(
                tagsString()
                    .toUpperCase()
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter((tag) => tag.length > 0),
            ),
        ]
        return registerTags(tagNameArray)
    }

    const submitNewMoment = () => {
        // Create Moment
        const date = new Date()

        createMoment({
            title: title(),
            content: content(),
            archiveId: selectedArchiveId(),
            timestamp: date,
            tagIds: saveTags(),
        })
    }

    const saveEdit = () => {
        const targetMomentId = editingMomentId()
        const targetMomentData = targetMomentId && allMoments[targetMomentId]
        if (!targetMomentData) return
        updateMoment(targetMomentId, {
            title: title(),
            content: content(),
            tagIds: saveTags(),
        })
        saveArchiveChanges()
        setBufferArchive(archiveName() || '')
    }

    const attemptSubmit = () => {
        if (title().trim() == '' || content().trim() == '') return
        if (displayedModal() == 'EDIT_MODAL' && editingMomentId()) {
            console.log('Attempting to modify moment!')
            saveEdit()
            setEditingMomentId()
            if (displayedMomentModalId()) {
                setDisplayedModal('DISPLAY_MOMENT_MODAL')
            } else {
                setDisplayedModal('NONE')
            }
        } else {
            submitNewMoment()
        }
        cleanupCreator()
    }

    onMount(() => {
        createEffect(() => {
            if (displayedModal() != 'NONE') return
            setEditingMomentId()
            setContent('')
            setTitle('')
            setTagsString('')
        })
    })

    const archiveName = createMemo(() => {
        let candidateArchiveName =
            archives()[selectedArchiveId() || ('' as ArchiveId)]?.name
        const editMomentId = editingMomentId()
        if (editMomentId) {
            candidateArchiveName =
                archives()[
                    allMoments[editMomentId].archiveId || defaultArchiveId
                ].name
        }
        if (candidateArchiveName == defaultArchiveName) return
        return candidateArchiveName
    })

    const [switchingArchive, setSwitchingArchive] = createSignal<boolean>(false)
    const [bufferArchive, setBufferArchive] = createSignal<string>(
        archiveName() || '',
    )

    createEffect(() => {
        const editingMomentData = allMoments[editingMomentId()!]

        const archiveData =
            archives()[editingMomentData?.archiveId! || selectedArchiveId()!]
        if (archiveData) {
            const name =
                archiveData.name == defaultArchiveName ? '' : archiveData.name
            setBufferArchive(name)
        }
    })

    const saveArchiveChanges = () => {
        const currentBufferArchiveName = bufferArchive()
        const editMomentId = editingMomentId()
        if (editMomentId) {
            swapMomentArchive(editMomentId, currentBufferArchiveName)
        }
    }

    return (
        <div
            class={`grid w-full transition-all duration-500 ease-in-out ${props.hide ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}
        >
            <div class="overflow-hidden">
                <div
                    class={`flex flex-col gap-3 overflow-hidden rounded-xl transition-all duration-500 ${props.hide ? 'border-element-matte grid-rows-[0fr] border-0' : 'bg-element-matte border-highlight-alt grid-rows-[1fr] border p-4'}`}
                >
                    <input
                        class="text-plain placeholder-sub bg-transparent px-2 py-1 text-lg font-bold outline-none"
                        placeholder="Moment Title..."
                        value={props.hide ? '' : title()}
                        onInput={(e) => setTitle(e.currentTarget.value)}
                    />
                    <div class="relative grid w-full">
                        <div
                            ref={textDisplayRef}
                            aria-hidden="true"
                            class={textDisplayClasses}
                        >
                            <For each={content().split(/(https?:\/\/[^\s]+)/g)}>
                                {(part, index) =>
                                    index() % 2 === 1 ? (
                                        <span
                                            onClick={() =>
                                                getApi().openExternalBrowser(
                                                    part,
                                                )
                                            }
                                            class="text-highlight-strongest underline hover:cursor-pointer"
                                        >
                                            {part}
                                        </span>
                                    ) : (
                                        <span class="text-main">{part}</span>
                                    )
                                }
                            </For>
                            {content().endsWith('\n') ? <br /> : ''}
                        </div>
                        <textarea
                            ref={textInputAreaRef}
                            onScroll={(e) => {
                                if (textDisplayRef) {
                                    textDisplayRef.scrollTop =
                                        e.currentTarget.scrollTop
                                }
                            }}
                            class={`${textDisplayClasses} caret-main selection:bg-highlight-strong selection:text-main placeholder:text-sub field-sizing-content resize-none bg-transparent text-transparent transition-colors outline-none placeholder:italic ${
                                isPreviewing()
                                    ? 'pointer-events-none cursor-default'
                                    : 'pointer-events-auto cursor-text'
                            }`}
                            placeholder="Moment description..."
                            onPaste={(e) => {
                                // Creating file references / previews
                                const clipboardData = e.clipboardData
                                if (!clipboardData) return

                                const items = clipboardData.items
                                for (let i = 0; i < items.length; i++) {
                                    const item = items[i]
                                    if (item.kind == 'file') {
                                        const file = item.getAsFile()
                                        e.preventDefault()
                                        if (file) {
                                            saveFileReference(file, {
                                                Start: textInputAreaRef?.selectionStart,
                                                End: textInputAreaRef?.selectionEnd,
                                            })
                                        }
                                        return
                                    }
                                }
                            }}
                            value={props.hide ? '' : content()}
                            onInput={(e) => setContent(e.currentTarget.value)}
                        />
                    </div>
                    <div class="mx-2 flex w-full flex-col items-center gap-6">
                        <input
                            class="bg-element text-highlight-matte placeholder-sub focus:border-highlight-strong w-full rounded border border-transparent px-2 py-1.5 font-mono text-xs outline-none"
                            placeholder="Tags (comma separated)... e.g. GAMES, ENTERTAINMENT, ROMANCE"
                            value={props.hide ? '' : tagsString()}
                            onInput={(e) =>
                                setTagsString(e.currentTarget.value)
                            }
                            onKeyDown={(e) => {
                                if (e.key == 'Enter') {
                                    attemptSubmit()
                                }
                            }}
                        />

                        <Show
                            when={
                                (title() != '' || content() != '') &&
                                getSuggestableTags().length > 0 &&
                                !props.hide
                            }
                        >
                            <div class="flex w-full flex-wrap items-center gap-2 rounded-lg text-sm font-bold tracking-widest">
                                <span class="text-sub font-black">
                                    Suggested:
                                </span>
                                <For each={getSuggestableTags()}>
                                    {(tagData) => (
                                        <span
                                            onClick={() => {
                                                setTagsString((prev) => {
                                                    const tagArray =
                                                        prev.split(',')
                                                    const length =
                                                        tagArray.length
                                                    tagArray[length - 1] =
                                                        tagData.name
                                                    return (
                                                        tagArray.join(',') + ','
                                                    )
                                                })
                                            }}
                                            style={`background-color: ${tagData.colour}`}
                                            class="text-dark rounded-lg px-2 py-1.5 text-xs font-black transition-all duration-100 hover:scale-105 hover:cursor-pointer active:scale-95"
                                        >
                                            #{tagData.name}
                                        </span>
                                    )}
                                </For>
                            </div>
                        </Show>

                        <Line class="bg-element-accent h-0.5 w-full" />
                        <div class="flex w-full flex-wrap items-center justify-between text-sm">
                            <div class="group bg-element-accent bg flex items-center gap-1 rounded p-2">
                                <div class="text-element-accent-highlight flex items-center gap-2 px-2 font-mono tracking-widest">
                                    <span>DESTINATION:</span>
                                    <input
                                        ref={archiveInputRef}
                                        disabled={
                                            switchingArchive() ? false : true
                                        }
                                        onFocusOut={() => {
                                            setSwitchingArchive(false)
                                        }}
                                        placeholder="No Archive"
                                        value={`${archiveName() || bufferArchive() ? bufferArchive() : ''}`}
                                        class="bg-element-accent text-highlight-matte field-sizing-content p-1"
                                        onInput={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            setBufferArchive(
                                                e.currentTarget.value
                                                    .trim()
                                                    .toUpperCase(),
                                            )
                                        }}
                                        onKeyDown={(e) => {
                                            e.stopPropagation()
                                            if (e.key == 'Enter') {
                                                setSwitchingArchive(false)
                                            }
                                            if (e.key == 'Escape') {
                                                setSwitchingArchive(false)
                                            }
                                        }}
                                    ></input>
                                    <i
                                        class={iconClasses + 'fa-pencil'}
                                        onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            setSwitchingArchive(true)
                                            if (archiveInputRef) {
                                                archiveInputRef.focus()
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                            <button
                                onClick={attemptSubmit}
                                class="hover:bg-highlight-strong hg hover:shadow-highlight-strong bg-highlight hover:border-highlight-strong rounded px-4 py-2 text-xs font-bold tracking-widest transition-all duration-200 hover:scale-105 hover:cursor-pointer hover:shadow-md hover:duration-50 active:scale-95"
                            >
                                {editingMomentId() ? 'EDIT' : 'STORE'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
