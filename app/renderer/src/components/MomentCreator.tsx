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
    activeLibraryId,
    activeUploadCount,
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
    type MomentData,
    type Tag,
} from '../modules/data'
import {
    displayedModal,
    displayedMomentModalId,
    animatedIconClasses,
    setDisplayedModal,
    sortTags,
} from '../modules/globals'
import { ExpandableContainer } from './ExpandableContainer'
import { TagButton } from './TagBar'
import { SmartEditor } from './SmartEditor'

const textDisplayClasses =
    'caret-plain selection:bg-highlight-strong selection:text-sub placeholder:text-sub field-sizing-content resize-none bg-transparent  transition-colors outline-none placeholder:italic col-start-1 row-start-1 h-auto max-h-96 min-h-12 w-full overflow-x-hidden overflow-y-auto border border-transparent px-2 py-1 font-sans text-sm leading-normal break-all whitespace-pre-wrap'

export const MomentCreator: Component<
    ComponentProps<'div'> & {
        hide?: boolean
    }
> = (props) => {
    let archiveInputRef: HTMLInputElement | undefined
    let textInputAreaRef: HTMLTextAreaElement | undefined // not visible
    let textDisplayRef: HTMLDivElement | undefined

    const [isDragging, setIsDragging] = createSignal<boolean>(false)

    const getSuggestableTags = createMemo(() => {
        const allTagDatas = Object.values(allTags)
        const currentTypedTags = tagsString()
            .split(',')
            .map((tag) => tag.toUpperCase().trim())

        const currentTypedTag = currentTypedTags[currentTypedTags.length - 1]
        const alreadyTypedTags = currentTypedTags.slice(0, -1)

        const suggestedTags: Array<Tag> = []
        for (const tagData of allTagDatas) {
            if (
                tagData.name.includes(currentTypedTag) &&
                !currentTypedTags.includes(tagData.name)
            ) {
                suggestedTags.push(tagData)
            }
        }

        return sortTags(suggestedTags, alreadyTypedTags)
    })

    const cleanupCreator = () => {
        setTitle('')
        setContent('')
        setTagsString('')
    }

    const saveTags = () => {
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

    const isUploading = () => activeUploadCount() > 0

    const attemptSubmit = () => {
        if (title().trim() == '' || content().trim() == '' || isUploading())
            return

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
            activeLibraryId()
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

    const processFiles = (files: FileList | File[]) => {
        let hasFiles = false
        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            if (file) {
                hasFiles = true
                saveFileReference(file, {
                    Start: textInputAreaRef?.selectionStart,
                    End: textInputAreaRef?.selectionEnd,
                })
            }
        }
        return hasFiles
    }

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault()
        if (!props.hide) setIsDragging(true)
    }

    const handleDragLeave = (e: DragEvent) => {
        e.preventDefault()
        if (
            e.currentTarget &&
            !(e.currentTarget as Node).contains(e.relatedTarget as Node)
        ) {
            setIsDragging(false)
        }
    }

    const handleDrop = (e: DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        if (props.hide) return

        const files = e.dataTransfer?.files
        if (files && files.length > 0) {
            processFiles(files)
        }
    }

    // Moment references
    const isTypingReference = createMemo(() => {
        const text = content()
        if (!textInputAreaRef) return null

        const cursor = textInputAreaRef.selectionStart
        const textBeforeCursor = text.substring(0, cursor)

        const lastOpen = textBeforeCursor.lastIndexOf('[[')
        const lastClose = textBeforeCursor.lastIndexOf(']]')

        if (lastOpen !== -1 && lastOpen > lastClose) {
            return textBeforeCursor.substring(lastOpen + 2)
        }
        return null
    })

    const suggestedMoments = createMemo(() => {
        const query = isTypingReference()
        if (query === null) return []

        const searchLower = query.toLowerCase()
        return Object.values(allMoments)
            .filter((m) => m.title.toLowerCase().includes(searchLower))
            .slice(0, 5)
    })

    const insertReference = (moment: MomentData) => {
        if (!textInputAreaRef) return

        const currentContent = content()
        const cursor = textInputAreaRef.selectionStart

        const textBeforeCursor = currentContent.substring(0, cursor)
        const openBracketPos = textBeforeCursor.lastIndexOf('[[')

        if (openBracketPos !== -1) {
            textInputAreaRef.focus()
            textInputAreaRef.setSelectionRange(openBracketPos + 2, cursor)

            document.execCommand('insertText', false, `${moment.uuid}]] `)
        }
    }

    return (
        <ExpandableContainer expanded={!props.hide}>
            <div class="relative max-w-4xl overflow-hidden">
                <Show when={isDragging() && !props.hide}>
                    <div class="bg-element/80 pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-xl backdrop-blur-sm">
                        <span class="text-highlight text-lg font-bold drop-shadow-md">
                            Drop files to attach
                        </span>
                    </div>
                </Show>

                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    class={`bg-element-matte flex flex-col gap-3 overflow-hidden rounded-xl transition-all duration-500 ${
                        props.hide
                            ? 'border-element-matte grid-rows-[0fr] border-0'
                            : isDragging()
                              ? 'border-highlight bg-element-accent/50 grid-rows-[1fr] border-2 border-dashed p-4'
                              : 'border-highlight-alt grid-rows-[1fr] border p-4'
                    }`}
                >
                    <input
                        class="text-sub placeholder-sub bg-transparent px-2 py-1 text-lg font-bold outline-none"
                        placeholder="Moment Title..."
                        value={props.hide ? '' : title()}
                        onInput={(e) => setTitle(e.currentTarget.value)}
                    />

                    <div class="relative grid w-full">
                        <SmartEditor
                            value={props.hide ? '' : content()}
                            onInput={setContent}
                            onSubmit={attemptSubmit}
                            onFilesAdded={processFiles}
                            popoverPlacement="bottom"
                            placeholder="Moment description..."
                            showMarkdownToolbar={true}
                            submitOnEnter={false}
                            minRows={2}
                            enableDragAndDrop={false}
                            maxHeightClass="max-h-96 min-h-[3rem]"
                            textAreaClass={textDisplayClasses}
                            onScroll={(e) => {
                                if (textDisplayRef) {
                                    textDisplayRef.scrollTop = (
                                        e.target as HTMLTextAreaElement
                                    ).scrollTop
                                }
                            }}
                        />
                    </div>

                    <div class="mx-2 flex w-full flex-col items-center gap-6">
                        <input
                            class="bg-element text-sub placeholder-sub focus:border-highlight-strong w-full rounded border border-transparent px-2 py-1.5 font-mono text-xs font-bold outline-none"
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
                                isTypingReference() !== null &&
                                suggestedMoments().length > 0 &&
                                !props.hide
                            }
                        >
                            <div class="flex w-full flex-wrap items-center gap-2 rounded-lg text-sm font-bold tracking-widest">
                                <span class="text-sub font-black">
                                    Link to:
                                </span>
                                <For each={suggestedMoments()}>
                                    {(moment) => (
                                        <button
                                            onMouseDown={(e) =>
                                                e.preventDefault()
                                            }
                                            onClick={() =>
                                                insertReference(moment)
                                            }
                                            class="bg-element hover:bg-element-accent text-sub border-element-accent hover:border-highlight-strong rounded border px-2 py-1 transition-all hover:scale-105 active:scale-95"
                                        >
                                            {moment.title}
                                        </button>
                                    )}
                                </For>
                            </div>
                        </Show>

                        <Show
                            when={
                                (title() != '' ||
                                    content() != '' ||
                                    tagsString().length > 0) &&
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
                                        <label
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
                                        >
                                            <TagButton
                                                disabled={true}
                                                tagId={tagData.id}
                                            />
                                        </label>
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
                                        class={
                                            animatedIconClasses + 'fa-pencil'
                                        }
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
                                disabled={isUploading()}
                                onClick={attemptSubmit}
                                class="hover:bg-highlight-strong hg hover:shadow-highlight-strong bg-highlight hover:border-highlight-strong rounded px-4 py-2 text-xs font-bold tracking-widest transition-all duration-200 hover:scale-105 hover:cursor-pointer hover:shadow-md hover:duration-50 active:scale-95"
                            >
                                {editingMomentId() ? 'EDIT' : 'STORE'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </ExpandableContainer>
    )
}
