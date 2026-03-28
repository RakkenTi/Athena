import {
    createEffect,
    createMemo,
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
    createMoment,
    defaultArchiveName,
    registerTags,
    saveFileReference,
    selectedArchiveId,
    updateMoment,
    type ArchiveId,
    type Tag,
} from '../modules/data'
import {
    content,
    displayedModal,
    editingMoment,
    setContent,
    setDisplayedModal,
    setEditingMoment,
    setTagsString,
    setTitle,
    sortTags,
    tagsString,
    title,
} from '../modules/globals'

export const MomentCreator: Component<
    ComponentProps<'div'> & {
        hide?: boolean
    }
> = (props) => {
    let textAreaRef: HTMLTextAreaElement | undefined

    const getSuggestableTags = createMemo(() => {
        // retrieve
        const currentTypedTags = tagsString()
            .split(',')
            .map((tag) => tag.toUpperCase().trim())
        const currentTypedTag = currentTypedTags[currentTypedTags.length - 1]

        const suggestedTags: Array<Tag> = []
        for (const [_, tagData] of Object.entries(allTags)) {
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
        const targetMomentId = editingMoment()
        const targetMomentData = targetMomentId && allMoments[targetMomentId]
        if (!targetMomentData) return
        updateMoment(targetMomentId, {
            title: title(),
            content: content(),
            tagIds: saveTags(),
        })
    }

    const attemptSubmit = () => {
        if (title().trim() == '' || content().trim() == '') return
        if (displayedModal() == 'EDIT_MODAL' && editingMoment()) {
            console.log('Attempting to modify moment!')
            saveEdit()
            setEditingMoment()
            setDisplayedModal('NONE')
        } else {
            submitNewMoment()
        }
        cleanupCreator()
    }

    onMount(() => {
        createEffect(() => {
            console.log('test')
            if (displayedModal() != 'NONE') return
            setEditingMoment()
            setContent('')
            setTitle('')
            setTagsString('')
        })
    })

    return (
        <div
            class={`grid w-full transition-all duration-500 ease-in-out ${props.hide ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'}`}
        >
            <div class="overflow-hidden">
                <div
                    class={`flex flex-col gap-3 overflow-hidden rounded-xl transition-all duration-500 ${props.hide ? 'grid-rows-[0fr] border-0 border-black' : 'bg-element-matte border-highlight-alt grid-rows-[1fr] border p-4'}`}
                >
                    <input
                        class="bg-transparent px-2 py-1 text-lg font-bold text-slate-100 placeholder-slate-600 outline-none"
                        placeholder="Moment Title..."
                        value={props.hide ? '' : title()}
                        onInput={(e) => setTitle(e.currentTarget.value)}
                    />
                    <textarea
                        ref={textAreaRef}
                        class="field-sizing-content h-auto max-h-96 min-h-12 bg-transparent px-2 py-1 text-sm text-slate-300 placeholder-slate-600 outline-none placeholder:italic"
                        placeholder="Moment description..."
                        onPaste={(e) => {
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
                                            Start: textAreaRef?.selectionStart,
                                            End: textAreaRef?.selectionEnd,
                                        })
                                    }
                                    return
                                }
                            }
                        }}
                        value={props.hide ? '' : content()}
                        onInput={(e) => setContent(e.currentTarget.value)}
                    />
                    <div class="mx-2 flex w-full flex-col items-center gap-6">
                        <input
                            class="w-full rounded border border-transparent bg-slate-950/50 px-2 py-1.5 font-mono text-xs text-cyan-400 placeholder-slate-600 outline-none focus:border-cyan-800"
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
                                getSuggestableTags().length > 0 &&
                                (title() != '' ||
                                    content() != '' ||
                                    tagsString() != '') &&
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
                            <div class="text-element-accent-highlight flex items-center gap-2 px-2 font-mono tracking-widest">
                                <span>DESTINATION:</span>
                                <span class="rounded bg-slate-800 px-2 py-1 text-cyan-400">
                                    {archives()[
                                        selectedArchiveId() || ('' as ArchiveId)
                                    ]?.name || defaultArchiveName}
                                </span>
                            </div>
                            <button
                                onClick={attemptSubmit}
                                class="hover:bg-highlight-strong hg hover:shadow-highlight-strong bg-highlight hover:border-highlight-strong rounded px-4 py-2 text-xs font-bold tracking-widest transition-all duration-200 hover:scale-105 hover:cursor-pointer hover:shadow-md hover:duration-50 active:scale-95"
                            >
                                {editingMoment() ? 'EDIT' : 'STORE'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
