import {
    createEffect,
    createMemo,
    createSignal,
    For,
    onCleanup,
    onMount,
    Show,
    type Component,
    type ComponentProps,
} from 'solid-js'
import { Line } from './Line'
import { LinkPreview } from './LinkPreview'
import { FILE_REF_REGEX, URL_REGEX } from '../modules/regex'
import {
    archives,
    defaultArchiveId,
    allTags,
    type MomentData,
    setTitle,
    setContent,
    setTagsString,
    setEditingMoment,
    setMomentToDelete,
} from '../modules/data'
import { FilePreview } from './FilePreview'
import {
    displayedModal,
    iconClasses,
    rootMarginPixels,
    setDisplayedModal,
    registerMediaFilter,
    extractContentParts,
    iterateUrlsInContentParts,
    displayType,
    setDisplayedMomentModalId,
    displayedMomentModalId,
} from '../modules/globals'

export type MomentProps = ComponentProps<'div'> & {
    data: MomentData
    isInsideModal?: boolean
}

export const Moment: Component<MomentProps> = (props) => {
    let containerRef: HTMLDivElement | undefined
    const data = props.data
    const [isConfirmingDelete, setIsConfirmingDelete] =
        createSignal<boolean>(false)

    createEffect(() => {
        if (displayedModal() == 'NONE') {
            setIsConfirmingDelete(false)
        }
    })

    // keep as memo, or else content is not reactive.
    const contentParts = createMemo(() => extractContentParts(data.content))

    // extract urls
    iterateUrlsInContentParts(contentParts(), (fragment) => {
        if (fragment.match(URL_REGEX)) {
            registerMediaFilter(fragment)
        }
    })

    const [inView, setInView] = createSignal<boolean>(false)

    onMount(() => {
        const viewObserver = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true)
                    viewObserver.disconnect()
                } else {
                    setInView(false)
                }
            },
            { rootMargin: `${rootMarginPixels}px` },
        )
        if (containerRef) viewObserver.observe(containerRef)
        onCleanup(() => viewObserver.disconnect())
    })

    const contentDisplayType = createMemo<'All' | 'Minimal'>(() => {
        if (
            displayedMomentModalId() == data.uuid &&
            props.isInsideModal == true
        )
            return 'All'
        if (displayType() == 'Grid') {
            return 'Minimal'
        }
        return 'All'
    })

    return (
        <div
            ref={containerRef}
            onClick={() => {
                if (displayType() == 'Grid') {
                    setDisplayedMomentModalId(data.uuid)
                    setDisplayedModal('DISPLAY_MOMENT_MODAL')
                }
            }}
            class={`${contentDisplayType() == 'Minimal' ? 'hover:cursor-pointer' : ''} group hover:bg-element-accent border-element-accent flex w-full flex-col gap-2 rounded border p-4 transition-all duration-300`}
        >
            <Show when={inView()}>
                <div class="flex flex-col flex-wrap gap-2">
                    <div class="flex justify-between">
                        <div class="flex w-full flex-col gap-2">
                            <span
                                class={`text-sub ${displayType() == 'Full' ? 'text-md' : 'text-sm'} font-semibold tracking-wider`}
                            >
                                {(() => {
                                    const timestamp = props.data.timestamp

                                    return new Intl.DateTimeFormat(
                                        navigator.language,
                                        {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true,
                                        },
                                    ).format(timestamp)
                                })()}
                            </span>
                            <Show when={data.archiveId != defaultArchiveId}>
                                <span
                                    class={`text-sub pr-1 ${displayType() == 'Full' ? 'text-lg' : 'text-md'} font-bold tracking-tight`}
                                >
                                    [{' '}
                                    {
                                        archives()[
                                            data.archiveId || ('' as any)
                                        ]?.name
                                    }{' '}
                                    ]
                                </span>
                            </Show>
                        </div>
                        <Show when={contentDisplayType() == 'All'}>
                            <div class="flex items-start gap-2">
                                <i
                                    class={iconClasses + 'fa-pencil'}
                                    onClick={(e) => {
                                        e.stopPropagation() // prevents triggering modal open
                                        setDisplayedModal('EDIT_MODAL')
                                        setTitle(data.title)
                                        setContent(data.content)
                                        setTagsString(
                                            (
                                                [...data.tagIds]
                                                    .map(
                                                        (tagId) =>
                                                            allTags[tagId].name,
                                                    )
                                                    .join(',') + ','
                                            ).replace(/,\s*$/, ''),
                                        )
                                        setEditingMoment(data.uuid)
                                    }}
                                />
                                <i
                                    class={
                                        iconClasses +
                                        `${isConfirmingDelete() ? 'fa-check' : 'fa-trash'}`
                                    }
                                    onClick={(e) => {
                                        e.stopPropagation() // prevents triggering modal open
                                        setMomentToDelete()
                                        if (!isConfirmingDelete()) {
                                            setIsConfirmingDelete(true)
                                        } else {
                                            setMomentToDelete(data.uuid)
                                            setDisplayedModal(
                                                'CONFIRM_MOMENT_DELETE',
                                            )
                                        }
                                    }}
                                />
                            </div>
                        </Show>
                    </div>
                    <span
                        class={`tracking ${displayType() == 'Full' ? 'text-4xl' : 'text-xl'} text-main font-black break-all`}
                    >
                        {data.title}
                    </span>
                </div>
                <Show when={contentDisplayType() == 'All'}>
                    <span class="text-element-accent-highlight flex flex-col gap-2 text-sm whitespace-pre-line">
                        <For each={contentParts()}>
                            {(text) => {
                                if (text.match(FILE_REF_REGEX)) {
                                    return <FilePreview uri={text} />
                                }
                                if (text.match(URL_REGEX)) {
                                    return <LinkPreview url={text} />
                                }
                                return (
                                    <span
                                        class={`${displayType() == 'Full' ? 'text-lg' : 'text-md'}`}
                                    >
                                        {text}
                                    </span>
                                )
                            }}
                        </For>
                    </span>
                </Show>
                <Show when={data.tagIds.length > 0}>
                    <Line class="bg-element-accent h-1 w-full" />
                    <div class="flex flex-wrap items-center gap-2 text-wrap">
                        <For each={data.tagIds}>
                            {(tagId) => {
                                const tagData = allTags[tagId]
                                const tagColour = tagData.colour
                                return (
                                    <span
                                        class={`text-dark tracking-tightest rounded-md px-2 py-1 text-center text-xs font-black break-all md:p-2`}
                                        style={`background-color: ${tagColour}`}
                                    >
                                        #{tagData.name}
                                    </span>
                                )
                            }}
                        </For>
                    </div>
                </Show>
            </Show>
        </div>
    )
}
