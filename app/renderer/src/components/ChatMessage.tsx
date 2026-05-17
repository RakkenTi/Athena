import { createSignal, Show, type Component } from 'solid-js'
import { type BufferMessage } from '../modules/store'
import { FormatChatDate } from '../modules/globals'
import { FancyTextRenderer } from './FancyTextRenderer'

export interface ChatMessageProps {
    message: BufferMessage
    showHeader: boolean
    onUpdate: (id: string, newContent: string) => void
    onDelete: (id: string) => void
}

export const ChatMessage: Component<ChatMessageProps> = (props) => {
    let editTextArea: HTMLTextAreaElement | undefined

    const [isEditing, setIsEditing] = createSignal(false)
    const [editContent, setEditContent] = createSignal('')
    const [isConfirmingDelete, setIsConfirmingDelete] = createSignal(false)

    const startEditing = () => {
        setEditContent(props.message.content)
        setIsEditing(true)
        setTimeout(() => editTextArea?.focus(), 0)
    }

    const saveEdit = () => {
        if (editContent().trim() !== props.message.content) {
            props.onUpdate(props.message.id, editContent())
        }
        setIsEditing(false)
    }

    return (
        <div
            id={`message-${props.message.id}`}
            class="group text-sub relative flex flex-col px-4 pt-1 transition-all duration-100 hover:bg-white/5"
        >
            <Show when={!isEditing()}>
                <div class="bg-element-matte border-element-accent absolute top-2 right-4 z-10 hidden gap-1 rounded-lg border p-1 shadow-xl group-hover:flex">
                    <button
                        onClick={() =>
                            navigator.clipboard.writeText(props.message.content)
                        }
                        class="hover:bg-highlight-strong/20 text-sub hover:text-highlight-strong rounded p-1 px-2 transition-all"
                        title="Copy Raw Text"
                    >
                        <i class="fa-solid fa-copy text-xs"></i>
                    </button>
                    <button
                        onClick={startEditing}
                        class="hover:bg-highlight-strong/20 text-sub hover:text-highlight-strong rounded p-1 px-2 transition-all"
                    >
                        <i class="fa-solid fa-pen-to-square text-xs"></i>
                    </button>
                    <button
                        onClick={() => {
                            if (isConfirmingDelete()) {
                                props.onDelete(props.message.id)
                            } else {
                                setIsConfirmingDelete(true)
                            }
                        }}
                        onMouseLeave={() => setIsConfirmingDelete(false)}
                        class={`rounded p-1 px-2 transition-all ${
                            isConfirmingDelete()
                                ? 'bg-red-500/20 text-[10px] font-bold text-red-400'
                                : 'text-sub hover:bg-red-500/20 hover:text-red-400'
                        }`}
                    >
                        <Show
                            when={isConfirmingDelete()}
                            fallback={<i class="fa-solid fa-trash text-xs"></i>}
                        >
                            Confirm?
                        </Show>
                    </button>
                </div>
            </Show>

            <Show when={props.showHeader}>
                <div class="flex items-baseline gap-2 pt-3">
                    <span class="text-highlight-strong text-sm font-black">
                        {props.message.author_name}
                    </span>
                    <span class="text-sub/50 font-mono text-xs">
                        {FormatChatDate(props.message.timestamp)}
                    </span>
                </div>
            </Show>

            <Show
                when={isEditing()}
                fallback={
                    <FancyTextRenderer
                        content={props.message.content}
                        compact={true}
                    />
                }
            >
                <div class="bg-element-accent/20 border-highlight-strong/30 mt-1 flex flex-col gap-2 rounded-lg border p-2">
                    <textarea
                        ref={editTextArea}
                        value={editContent()}
                        onKeyDown={(e) => {
                            if (
                                e.key.toLowerCase() === 'enter' &&
                                !e.shiftKey
                            ) {
                                e.preventDefault()
                                saveEdit()
                            }
                            if (e.key === 'Escape') {
                                e.preventDefault()
                                setIsEditing(false)
                            }
                        }}
                        onInput={(e) => setEditContent(e.currentTarget.value)}
                        class="text-sub field-sizing-content max-h-[50vh] w-full resize-none overflow-y-auto bg-transparent outline-none"
                        rows="1"
                    />
                    <div class="flex justify-end gap-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            class="text-sub/50 hover:text-sub text-xs font-bold"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={saveEdit}
                            class="text-highlight-strong text-xs font-bold hover:underline"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </Show>
        </div>
    )
}
