import {
    createSignal,
    onCleanup,
    createEffect,
    Show,
    untrack,
    type Component,
    type ComponentProps,
    For,
    onMount,
} from 'solid-js'
import { getActiveLibrary, type BufferMessage } from '../modules/store'
import { displayedModal } from '../modules/globals'
import { saveFileReference } from '../modules/data'
import { flushActionQueue, queueAction } from '../modules/actions'
import { SmartEditor } from './SmartEditor'
import { ChatMessage } from './ChatMessage'

const BATCH_SIZE = 250
const MAX_RENDER_COUNT = 500

const [renderedMessages, setRenderedMessages] = createSignal<
    Array<BufferMessage>
>([])
export const GetLastBufferMessage = () =>
    renderedMessages()[renderedMessages().length - 1]

const Sentinel: Component<
    {
        ref: HTMLDivElement | undefined
        disabled: boolean
        loading?: boolean
    } & ComponentProps<'div'>
> = (props) => (
    <div
        ref={props.ref}
        class={`${props.disabled ? 'hidden' : ''} flex w-full shrink-0 items-center justify-center ${props.loading ? 'h-8 py-2' : 'h-1'}`}
    >
        <Show when={props.loading}>
            <i class="fa-solid fa-circle-notch text-highlight animate-spin text-sm"></i>
        </Show>
    </div>
)

export const BufferChatModal = () => {
    let chatContainerRef: HTMLDivElement | undefined
    let topSentinelRef: HTMLDivElement | undefined
    let bottomSentinelRef: HTMLDivElement | undefined

    const [name, setName] = createSignal(
        localStorage.getItem(`${getActiveLibrary()?.id}_chatname`) || '',
    )

    const [content, setContent] = createSignal('')
    const [isLoadingOlder, setIsLoadingOlder] = createSignal(false)
    const [isLoadingNewer, setIsLoadingNewer] = createSignal(false)
    const [activeUploadCount, setActiveUploadCount] = createSignal(0)
    const [lastMutationTime, setLastMutationTime] = createSignal(0)
    const [pendingIds, setPendingIds] = createSignal<Set<string>>(new Set())

    const [isDragging, setIsDragging] = createSignal<boolean>(false)

    const handleDragOver = (e: DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
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

        const files = e.dataTransfer?.files
        if (files && files.length > 0) {
            processFiles(files)
        }
    }

    const [isAtPresent, setIsAtPresent] = createSignal(true)
    const [showScrollBottom, setShowScrollBottom] = createSignal(false)

    const processFiles = (files: FileList | File[]) => {
        let hasFiles = false
        for (let i = 0; i < files.length; i++) {
            const file = files[i]
            if (file) {
                hasFiles = true
                saveFileReference(
                    file,
                    {
                        Start: undefined,
                        End: undefined,
                    },
                    {
                        getContent: content,
                        setContent: setContent,
                        setActiveUploadCount: setActiveUploadCount,
                    },
                )
            }
        }
        return hasFiles
    }

    const applyAnchoredUpdate = (newMessages: BufferMessage[]) => {
        if (!chatContainerRef) {
            setRenderedMessages(newMessages)
            return
        }

        const children = Array.from(
            chatContainerRef.querySelectorAll('[id^="message-"]'),
        ) as HTMLElement[]
        const anchorEl =
            children.find(
                (el) => el.offsetTop >= chatContainerRef!.scrollTop,
            ) || children[0]

        const anchorId = anchorEl ? anchorEl.id : null
        const anchorOffset = anchorEl
            ? anchorEl.offsetTop - chatContainerRef.scrollTop
            : 0

        setRenderedMessages(newMessages)

        setTimeout(() => {
            if (anchorId && chatContainerRef) {
                const newAnchorEl = document.getElementById(anchorId)
                if (newAnchorEl) {
                    chatContainerRef.scrollTop =
                        newAnchorEl.offsetTop - anchorOffset
                }
            }
        }, 0)
    }

    const scrollToBottom = () => {
        setTimeout(() => {
            if (chatContainerRef)
                chatContainerRef.scrollTop = chatContainerRef.scrollHeight
        }, 50)
    }

    const syncLiveChat = async () => {
        const lib = getActiveLibrary()
        if (!lib || lib.type !== 'server') return

        if (Date.now() - lastMutationTime() < 2500) return

        try {
            const wasAtBottom =
                chatContainerRef &&
                chatContainerRef.scrollHeight -
                    chatContainerRef.scrollTop -
                    chatContainerRef.clientHeight <
                    100

            const res = await fetch(`${lib.url}/api/buffer`, {
                headers: { Authorization: `Bearer ${lib.token}` },
            })

            if (res.ok) {
                const data: BufferMessage[] = await res.json()

                let hasNewMessage = false

                setPendingIds((prev) => {
                    const next = new Set(prev)
                    data.forEach((d) => next.delete(d.id))
                    return next
                })

                setRenderedMessages((prevMsgs) => {
                    const merged = new Map<string, BufferMessage>()

                    let serverBoundary = Infinity
                    if (data.length >= 50) {
                        serverBoundary = new Date(data[0].timestamp).getTime()
                    } else {
                        serverBoundary = 0
                    }

                    prevMsgs.forEach((m) => {
                        const t = new Date(m.timestamp).getTime()
                        if (t < serverBoundary) merged.set(m.id, m)
                    })

                    data.forEach((m) => {
                        const existing = prevMsgs.find((p) => p.id === m.id)

                        if (!existing) {
                            hasNewMessage = true
                        }

                        if (existing && existing.content === m.content) {
                            existing.timestamp = m.timestamp
                            merged.set(m.id, existing)
                        } else {
                            merged.set(m.id, m)
                        }
                    })

                    prevMsgs.forEach((m) => {
                        if (!merged.has(m.id) && pendingIds().has(m.id)) {
                            merged.set(m.id, m)
                        }
                    })

                    return Array.from(merged.values()).sort(
                        (a, b) =>
                            new Date(a.timestamp).getTime() -
                            new Date(b.timestamp).getTime(),
                    )
                })

                if (wasAtBottom && hasNewMessage) scrollToBottom()
            }
        } catch (err) {}
    }

    const jumpToPresent = async () => {
        const lib = getActiveLibrary()
        if (!lib || lib.type !== 'server') return
        setIsAtPresent(true)
        await syncLiveChat()
        scrollToBottom()
    }

    const fetchOlderMessages = async () => {
        if (isLoadingOlder() || renderedMessages().length === 0) return
        const lib = getActiveLibrary()
        if (!lib || lib.type !== 'server') return

        setIsLoadingOlder(true)
        try {
            let oldestMsg = renderedMessages()[0]
            let fetchedRealData = false
            let attempts = 0

            while (!fetchedRealData && attempts < 3) {
                const url = `${lib.url}/api/buffer?before=${encodeURIComponent(oldestMsg.timestamp)}`
                const res = await fetch(url, {
                    headers: { Authorization: `Bearer ${lib.token}` },
                })

                if (!res.ok) break

                const data: BufferMessage[] = await res.json()
                if (!data || data.length === 0) break

                const validMessages = data.filter((m) => !m.deleted)

                if (validMessages.length > 0) {
                    let combined = [...validMessages, ...renderedMessages()]
                    if (combined.length > MAX_RENDER_COUNT) {
                        combined = combined.slice(0, MAX_RENDER_COUNT)
                        setIsAtPresent(false)
                    }
                    applyAnchoredUpdate(combined)
                    fetchedRealData = true
                } else {
                    oldestMsg = data[0]
                    attempts++
                }
            }
        } catch (err) {
        } finally {
            setIsLoadingOlder(false)
        }
    }

    const fetchNewerMessages = async () => {
        if (isLoadingNewer() || renderedMessages().length === 0) return
        const lib = getActiveLibrary()
        if (!lib || lib.type !== 'server') return

        setIsLoadingNewer(true)
        try {
            const currentMsgs = renderedMessages()
            const latestMsg = currentMsgs[currentMsgs.length - 1]
            const url = `${lib.url}/api/buffer?after=${encodeURIComponent(latestMsg.timestamp)}`

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${lib.token}` },
            })
            if (res.ok) {
                const data = await res.json()
                if (data && data.length > 0) {
                    let combined = [...currentMsgs, ...data]
                    if (combined.length > MAX_RENDER_COUNT) {
                        combined = combined.slice(
                            combined.length - MAX_RENDER_COUNT,
                        )
                    }
                    applyAnchoredUpdate(combined)
                    if (data.length < BATCH_SIZE) setIsAtPresent(true)
                } else {
                    setIsAtPresent(true)
                }
            }
        } catch (err) {
        } finally {
            setIsLoadingNewer(false)
        }
    }

    const sendMessage = async () => {
        if (activeUploadCount() > 0) return
        if (!content().trim()) return
        const lib = getActiveLibrary()
        if (!lib || lib.type !== 'server') return

        if (!isAtPresent()) {
            await jumpToPresent()
        }

        setLastMutationTime(Date.now())

        const newMsg: BufferMessage = {
            id: 'msg_' + crypto.randomUUID(),
            author_name: name()?.trim() || 'Anonymous',
            content: content().trim(),
            timestamp: new Date().toISOString(),
        }

        setPendingIds((prev) => new Set(prev).add(newMsg.id))

        setRenderedMessages((prev) => {
            let combined = [...prev, newMsg]
            if (combined.length > MAX_RENDER_COUNT)
                combined = combined.slice(combined.length - MAX_RENDER_COUNT)
            return combined
        })
        setContent('')
        scrollToBottom()

        queueAction({
            type: 'CREATE',
            target: 'BUFFER_MESSAGE',
            target_id: newMsg.id,
            body: newMsg,
        })
        flushActionQueue()
    }

    const deleteMessage = (id: string) => {
        setLastMutationTime(Date.now())
        setRenderedMessages((prev) => prev.filter((m) => m.id !== id))

        queueAction({
            type: 'DELETE',
            target: 'BUFFER_MESSAGE',
            target_id: id,
            body: {},
        })
        flushActionQueue()
    }

    const updateMessageContent = (id: string, newContent: string) => {
        setLastMutationTime(Date.now())

        setRenderedMessages((prev) => {
            const existing = prev.find((m) => m.id === id)
            if (!existing) return prev

            const updatedMsg = {
                ...existing,
                content: newContent,
                updated_at: new Date().toISOString(),
            }

            queueAction({
                type: 'UPDATE',
                target: 'BUFFER_MESSAGE',
                target_id: id,
                body: updatedMsg,
            })
            flushActionQueue()

            return prev.map((m) => (m.id === id ? updatedMsg : m))
        })
    }

    let lastID: string
    createEffect(() => {
        const lib = getActiveLibrary()
        if (!lib) return
        const id = lib.id
        if (lastID != id) {
            setName(localStorage.getItem(`${id}_chatname`) || '')
            lastID = id
        } else return

        untrack(() => {
            setRenderedMessages([])
            setIsAtPresent(true)
            setContent('')
            setShowScrollBottom(false)

            syncLiveChat().then(() => {
                if (displayedModal() === 'CHAT_MODAL') scrollToBottom()
            })
        })
    })

    createEffect(() => {
        const isOpen = displayedModal() === 'CHAT_MODAL'
        if (isOpen) {
            untrack(() => {
                syncLiveChat().then(() => {
                    scrollToBottom()
                })
            })
        }
    })

    createEffect(() => {
        if (!chatContainerRef || !topSentinelRef || !bottomSentinelRef) return

        const topObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isLoadingOlder())
                fetchOlderMessages()
        })

        const bottomObserver = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !isLoadingNewer())
                fetchNewerMessages()
        })

        topObserver.observe(topSentinelRef)
        bottomObserver.observe(bottomSentinelRef)

        onCleanup(() => {
            topObserver.disconnect()
            bottomObserver.disconnect()
        })
    })

    onMount(() => {
        const interval = setInterval(() => {
            if (isAtPresent()) syncLiveChat()
        }, 1000)
        onCleanup(() => clearInterval(interval))
    })

    const shouldShowHeader = (msg: BufferMessage, index: number) => {
        if (index === 0) return true
        const prevMsg = renderedMessages()[index - 1]
        if (!prevMsg) return true
        if (msg.author_name !== prevMsg.author_name) return true

        const currTime = new Date(msg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        })
        const prevTime = new Date(prevMsg.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
        })
        return currTime !== prevTime
    }

    createEffect(() => {
        if (!chatContainerRef) return

        const handleImageLoad = (e: Event) => {
            const target = e.target as HTMLElement

            if (target.tagName === 'IMG' || target.tagName === 'VIDEO') {
                if (!showScrollBottom()) {
                    chatContainerRef!.scrollTop = chatContainerRef!.scrollHeight
                }
            }
        }

        chatContainerRef.addEventListener('load', handleImageLoad, true)

        onCleanup(() => {
            chatContainerRef.removeEventListener('load', handleImageLoad, true)
        })
    })

    return (
        <div class="border-element-accent bg-element-matte flex max-h-[90vh] w-full flex-col rounded-xl border">
            <div class="border-element-accent flex items-center justify-between border-b p-3">
                <h2 class="text-sub text-sm font-bold tracking-widest">
                    <i class="fa-solid fa-message text-highlight mr-2"></i> Chat
                </h2>
                <Show when={!isAtPresent()}>
                    <span class="text-highlight-strong bg-highlight-strong/10 animate-pulse rounded px-2 py-1 text-xs font-bold">
                        Viewing History
                    </span>
                </Show>
            </div>

            <div
                class={`${displayedModal() === 'CHAT_MODAL' ? 'flex' : 'hidden'} relative h-[70vh] w-full flex-col overflow-hidden`}
            >
                <Show
                    when={renderedMessages().length === 0 && !isLoadingOlder()}
                >
                    <div class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
                        <span class="text-sub/50 text-sm font-bold italic">
                            No messages yet.
                        </span>
                    </div>
                </Show>

                <div
                    ref={chatContainerRef}
                    onScroll={(e) => {
                        const target = e.currentTarget
                        const dist =
                            target.scrollHeight -
                            target.scrollTop -
                            target.clientHeight
                        setShowScrollBottom(dist > 200)

                        if (target.scrollTop < 200 && !isLoadingOlder())
                            fetchOlderMessages()
                        if (dist < 200 && !isAtPresent() && !isLoadingNewer())
                            fetchNewerMessages()
                    }}
                    class="h-full w-full flex-1 overflow-y-auto pt-2 pb-4"
                >
                    <Sentinel
                        disabled={renderedMessages().length === 0}
                        loading={isLoadingOlder()}
                        ref={topSentinelRef}
                    />

                    <For each={renderedMessages()}>
                        {(message: BufferMessage, i) => (
                            <ChatMessage
                                message={message}
                                showHeader={shouldShowHeader(message, i())}
                                onUpdate={updateMessageContent}
                                onDelete={deleteMessage}
                            />
                        )}
                    </For>
                    <Sentinel
                        disabled={
                            renderedMessages().length === 0 || isAtPresent()
                        }
                        loading={isLoadingNewer()}
                        ref={bottomSentinelRef}
                    />
                </div>

                <Show when={showScrollBottom() || !isAtPresent()}>
                    <button
                        onClick={jumpToPresent}
                        class="bg-highlight-strong text-dark hover:bg-highlight-strongest absolute right-6 bottom-4 z-50 flex items-center justify-center gap-2 rounded-full px-4 py-2 shadow-lg transition-all hover:scale-105 active:scale-95"
                    >
                        <Show
                            when={!isAtPresent()}
                            fallback={
                                <i class="fa-solid fa-arrow-down text-lg"></i>
                            }
                        >
                            <span class="text-sm font-bold">
                                Jump to Present
                            </span>
                        </Show>
                    </button>
                </Show>
            </div>

            <div
                class="border-element-accent bg-element flex flex-col gap-2 rounded-b-xl border-t p-3"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <Show when={isDragging()}>
                    <div class="bg-element/80 pointer-events-none absolute inset-0 z-50 flex items-center justify-center rounded-b-xl backdrop-blur-sm">
                        <span class="text-highlight text-lg font-bold drop-shadow-md">
                            Drop files to attach
                        </span>
                    </div>
                </Show>

                <input
                    type="text"
                    placeholder="Your Name"
                    value={name()}
                    onInput={(e) => {
                        setName(e.currentTarget.value)
                        localStorage.setItem(
                            `${getActiveLibrary()?.id}_chatname`,
                            e.currentTarget.value,
                        )
                    }}
                    class="bg-element-matte border-element-accent focus:border-sub/50 text-sub w-full rounded p-2 font-bold transition-all outline-none"
                />
                <div class="flex items-end gap-2">
                    <SmartEditor
                        focusOn={() => displayedModal() === 'CHAT_MODAL'}
                        value={content()}
                        onInput={setContent}
                        onSubmit={sendMessage}
                        onFilesAdded={processFiles}
                        placeholder={`Message ${getActiveLibrary()?.name || 'Library'}`}
                        showMarkdownToolbar={false} // Hidden for chat
                        submitOnEnter={true} // Send message on standard Enter
                        maxHeightClass="max-h-[25vh]"
                        textAreaClass="bg-element-matte border-element-accent focus:border-sub/50 text-sub field-sizing-content overflow-y-auto rounded p-3 transition-all"
                    />

                    <button
                        onClick={sendMessage}
                        disabled={!content().trim() || activeUploadCount() > 0}
                        class="bg-highlight-strong text-dark hover:bg-highlight-strongest rounded px-4 py-3 font-bold transition-all disabled:pointer-events-none disabled:opacity-50"
                    >
                        <i
                            class={
                                activeUploadCount() > 0
                                    ? 'fa-solid fa-circle-notch animate-spin'
                                    : 'fa-solid fa-paper-plane'
                            }
                        ></i>
                    </button>
                </div>
            </div>
        </div>
    )
}
