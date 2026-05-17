import {
    createSignal,
    createMemo,
    createEffect,
    For,
    Show,
    type Component,
} from 'solid-js'
import { allMoments } from '../modules/store'

export interface SmartEditorProps {
    value: string
    onInput: (val: string) => void
    onSubmit: () => void
    onFilesAdded: (files: File[] | FileList) => void

    placeholder?: string
    minRows?: number
    maxHeightClass?: string
    textAreaClass?: string

    showMarkdownToolbar?: boolean
    submitOnEnter?: boolean
    onScroll?: (e: Event) => void
    enableDragAndDrop?: boolean

    popoverPlacement?: 'top' | 'bottom'
}

export const SmartEditor: Component<SmartEditorProps> = (props) => {
    let textAreaRef: HTMLTextAreaElement | undefined

    const [cursorPos, setCursorPos] = createSignal(0)
    const [query, setQuery] = createSignal<string | null>(null)

    const [selectedIndex, setSelectedIndex] = createSignal(0)

    const autocompleteMatches = createMemo(() => {
        const q = query()
        if (q === null || !allMoments) return []

        const searchLower = q.toLowerCase()
        return Object.values(allMoments)
            .filter((m: any) => m?.title?.toLowerCase().includes(searchLower))
            .slice(0, 5)
    })

    createEffect(() => {
        autocompleteMatches()
        setSelectedIndex(0)
    })

    const insertMarkdown = (prefix: string, suffix: string = '') => {
        if (!textAreaRef) return

        const start = textAreaRef.selectionStart
        const end = textAreaRef.selectionEnd
        const value = textAreaRef.value
        const selected = value.substring(start, end)

        const newSelectedText = selected
            ? `${prefix}${selected}${suffix}`
            : `${prefix}${suffix}`

        textAreaRef.focus()
        textAreaRef.setSelectionRange(start, end)
        document.execCommand('insertText', false, newSelectedText)

        if (selected) {
            textAreaRef.selectionStart = start + prefix.length
            textAreaRef.selectionEnd = start + prefix.length + selected.length
        } else {
            const newCursorPos = start + prefix.length
            textAreaRef.selectionStart = newCursorPos
            textAreaRef.selectionEnd = newCursorPos
        }
        props.onInput(textAreaRef.value)
    }

    const handleInput = (e: any) => {
        const val = e.currentTarget.value
        props.onInput(val)

        const cursor = e.currentTarget.selectionStart || 0
        setCursorPos(cursor)

        const textBeforeCursor = val.slice(0, cursor)

        const currentWordMatch = textBeforeCursor.match(
            /(^|\s)(@|\[\[)([^\]\s]*)$/,
        )

        if (currentWordMatch) {
            setQuery(currentWordMatch[3])
        } else {
            setQuery(null)
        }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
        if (!textAreaRef) return

        const matches = autocompleteMatches()
        if (query() !== null && matches.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault()
                setSelectedIndex((p) => (p + 1) % matches.length)
                return
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault()
                setSelectedIndex(
                    (p) => (p - 1 + matches.length) % matches.length,
                )
                return
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault()
                insertReference(matches[selectedIndex()])
                return
            }
            if (e.key === 'Escape') {
                e.preventDefault()
                setQuery(null)
                return
            }
        }

        if (props.submitOnEnter) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                props.onSubmit()
                setQuery(null)
                return
            }
        } else {
            if (
                (e.ctrlKey || e.metaKey) &&
                (e.key === 'Enter' || e.key.toLowerCase() === 's')
            ) {
                e.preventDefault()
                props.onSubmit()
                setQuery(null)
                return
            }
        }

        if (e.key.toLowerCase() === 'tab') {
            e.preventDefault()
            insertMarkdown('    ')
            return
        }

        if ((e.ctrlKey || e.metaKey) && props.showMarkdownToolbar) {
            const key = e.key.toLowerCase()
            let handled = true

            if (key === 'b') insertMarkdown('**', '**')
            else if (key === 'i') insertMarkdown('*', '*')
            else if (key === 'k') insertMarkdown('[', '](url)')
            else if (key === 'd') insertMarkdown('~~', '~~')
            else if (key === 'x') {
                const start = textAreaRef.selectionStart
                const end = textAreaRef.selectionEnd
                const value = textAreaRef.value

                const lineStart = value.lastIndexOf('\n', start - 1) + 1
                let lineEnd = value.indexOf('\n', end)
                if (lineEnd === -1) lineEnd = value.length

                navigator.clipboard.writeText(
                    value.substring(lineStart, lineEnd),
                )
                textAreaRef.setSelectionRange(lineStart, lineEnd)
                document.execCommand('insertText', false, '')
            } else {
                handled = false
            }

            if (handled) {
                e.preventDefault()
                e.stopPropagation()
            }
        }
    }

    const handlePaste = (e: ClipboardEvent) => {
        const clipboardData = e.clipboardData
        if (!clipboardData) return

        const items = clipboardData.items
        const filesToProcess: File[] = []

        for (let i = 0; i < items.length; i++) {
            if (items[i].kind === 'file') {
                const file = items[i].getAsFile()
                if (file) filesToProcess.push(file)
            }
        }

        if (filesToProcess.length > 0) {
            props.onFilesAdded(filesToProcess)
            e.preventDefault()
        }
    }

    const insertReference = (match: any) => {
        if (!textAreaRef) return

        const insertText = `[[${match.uuid}]] `

        const textBefore = props.value.slice(0, cursorPos())
        const textAfter = props.value.slice(cursorPos())
        const cleanTextBefore = textBefore.replace(
            /(^|\s)(@|\[\[)([^\]\s]*)$/,
            '$1',
        )

        props.onInput(cleanTextBefore + insertText + textAfter)
        setQuery(null)
        textAreaRef.focus()
    }

    const ToolbarButton: Component<{
        icon: string
        title: string
        onClick: () => void
    }> = (btnProps) => (
        <button
            title={btnProps.title}
            onClick={btnProps.onClick}
            onMouseDown={(e) => e.preventDefault()}
            class="text-sub hover:text-highlight-strong hover:bg-element-accent flex items-center justify-center rounded p-1 transition-colors"
        >
            <span class="material-symbols-outlined" style="font-size: 18px;">
                {btnProps.icon}
            </span>
        </button>
    )

    return (
        <div class="relative flex w-full flex-col">
            <Show when={props.showMarkdownToolbar}>
                <div class="border-element-accent mb-2 flex items-center gap-1 border-b px-2 pb-2">
                    <ToolbarButton
                        icon="format_bold"
                        title="Bold"
                        onClick={() => insertMarkdown('**', '**')}
                    />
                    <ToolbarButton
                        icon="format_italic"
                        title="Italic"
                        onClick={() => insertMarkdown('*', '*')}
                    />
                    <ToolbarButton
                        icon="format_strikethrough"
                        title="Strikethrough"
                        onClick={() => insertMarkdown('~~', '~~')}
                    />
                    <div class="bg-element-accent mx-1 h-4 w-px"></div>
                    <ToolbarButton
                        icon="title"
                        title="Heading"
                        onClick={() => insertMarkdown('# ')}
                    />
                    <ToolbarButton
                        icon="format_list_bulleted"
                        title="Bullet List"
                        onClick={() => insertMarkdown('- ')}
                    />
                    <ToolbarButton
                        icon="format_quote"
                        title="Quote"
                        onClick={() => insertMarkdown('> ')}
                    />
                    <div class="bg-element-accent mx-1 h-4 w-px"></div>
                    <ToolbarButton
                        icon="code"
                        title="Code"
                        onClick={() => insertMarkdown('`', '`')}
                    />
                    <div class="bg-element-accent mx-1 h-4 w-px"></div>
                    <ToolbarButton
                        icon="table_chart"
                        title="Table"
                        onClick={() =>
                            insertMarkdown(
                                '\n| Header 1 | Header 2 |\n| :--- | :--- |\n| Cell 1 | Cell 2 |\n',
                            )
                        }
                    />
                </div>
            </Show>

            <Show when={query() !== null && autocompleteMatches().length > 0}>
                {/* ✨ UPDATED: Listens to popoverPlacement to push up or push down! */}
                <div
                    class={`bg-element-matte border-element-accent absolute left-0 z-50 flex w-full max-w-sm flex-col rounded-xl border p-1 shadow-2xl ${
                        props.popoverPlacement === 'bottom'
                            ? 'top-full mt-2'
                            : 'bottom-full mb-2'
                    }`}
                >
                    <span class="text-sub/50 px-2 py-1 text-xs font-bold tracking-widest uppercase">
                        Link to Moment
                    </span>
                    <For each={autocompleteMatches()}>
                        {(match, index) => (
                            <button
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() => insertReference(match)}
                                class={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-bold transition-all ${
                                    selectedIndex() === index()
                                        ? 'bg-highlight-strong text-dark'
                                        : 'text-sub hover:bg-highlight-strong/20 hover:text-highlight-strong'
                                }`}
                            >
                                <i class="fa-solid fa-file-lines opacity-50"></i>
                                {match.title}
                            </button>
                        )}
                    </For>
                </div>
            </Show>

            <textarea
                ref={textAreaRef}
                rows={props.minRows || 1}
                placeholder={props.placeholder || 'Type here...'}
                value={props.value}
                onInput={handleInput}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                onScroll={props.onScroll}
                onDragEnter={(e) => e.preventDefault()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault()

                    if (!props.enableDragAndDrop) return
                    if (
                        e.dataTransfer?.files &&
                        e.dataTransfer.files.length > 0
                    ) {
                        props.onFilesAdded(e.dataTransfer.files)
                    }
                }}
                class={`placeholder:text-sub/50 w-full resize-none bg-transparent outline-none ${props.textAreaClass || 'text-sub field-sizing-content overflow-y-auto'} ${props.maxHeightClass || 'max-h-[30vh]'}`}
            />
        </div>
    )
}
