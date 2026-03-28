import {
    createEffect,
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
import {
    FILE_REF_REGEX,
    URL_DOMAIN_REGEX,
    URL_FILE_REGEX,
    URL_MAIN_DOMAIN_REGEX,
    URL_REGEX,
} from '../modules/regex'
import {
    archives,
    defaultArchiveId,
    setAvailableURLFiltersAndNicknames,
    allTags,
    type MomentData,
} from '../modules/data'
import { FilePreview } from './FilePreview'
import {
    displayedModal,
    iconClasses,
    rootMarginPixels,
    setContent,
    setDisplayedModal,
    setEditingMoment,
    setMomentToDelete,
    setTagsString,
    setTitle,
} from '../modules/globals'

export type MomentProps = ComponentProps<'div'> & {
    data: MomentData
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

    const contentParts = () =>
        data.content
            .split(URL_FILE_REGEX)
            .filter((fragment) => fragment && fragment.trim() !== '')

    // extract urls
    createEffect(() => {
        for (const text of contentParts()) {
            if (text.match(URL_REGEX)) {
                const match =
                    text.match(URL_MAIN_DOMAIN_REGEX) ||
                    text.match(URL_DOMAIN_REGEX)

                if (match && match.groups) {
                    const domainName = match.groups.domain

                    setAvailableURLFiltersAndNicknames((prev) => ({
                        ...prev,
                        [match[0].toLowerCase()]: domainName.toUpperCase(),
                    }))
                }
            }
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

    return (
        <div
            ref={containerRef}
            class="group hover:bg-element-accent border-element-accent flex w-full flex-col gap-2 rounded border p-4 transition-all duration-300"
        >
            <Show when={inView()}>
                <div class="flex flex-col flex-wrap gap-2">
                    <div class="flex justify-between">
                        <div class="flex w-full flex-col gap-2">
                            <span class="text-sub text-md font-semibold tracking-wider">
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
                                <span class="text-sub pr-1 text-lg font-bold tracking-tight">
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
                        <div class="flex items-start gap-2">
                            <i
                                class={iconClasses + 'fa-pencil'}
                                onClick={() => {
                                    setDisplayedModal('EDIT_MODAL')
                                    setTitle(data.title)
                                    setContent(data.content)
                                    setTagsString(
                                        [...data.tagIds]
                                            .map((tagId) => allTags[tagId].name)
                                            .join(',') + ',',
                                    )
                                    setEditingMoment(data.uuid)
                                }}
                            />
                            <i
                                class={
                                    iconClasses +
                                    `${isConfirmingDelete() ? 'fa-check' : 'fa-trash'}`
                                }
                                onClick={() => {
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
                    </div>
                    <span class="tracking text-4xl font-black">
                        {data.title}
                    </span>
                </div>
                <span class="text-element-accent-highlight flex flex-col gap-2 text-sm whitespace-pre-line">
                    <For each={contentParts()}>
                        {(text) => {
                            if (text.match(FILE_REF_REGEX)) {
                                return <FilePreview uri={text} />
                            }
                            if (text.match(URL_REGEX)) {
                                console.log('URL detected')
                                return <LinkPreview url={text} />
                            }
                            return <span class="text-lg">{text}</span>
                        }}
                    </For>
                </span>
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
