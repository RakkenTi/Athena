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
import { Line } from '../barebone/Line'
import { LinkPreview } from './LinkPreview'
import {
    URL_DOMAIN_REGEX,
    URL_MAIN_DOMAIN_REGEX,
    URL_REGEX,
} from '../../modules/regex'
import {
    archives,
    defaultArchiveId,
    setAvailableURLFiltersAndNicknames,
    tags,
    type MomentData,
} from '../../modules/data'

export type MomentProps = ComponentProps<'div'> & {
    data: MomentData
}

export const Moment: Component<MomentProps> = (props) => {
    let containerRef: HTMLDivElement | undefined
    const data = props.data

    const contentParts = () =>
        data.content
            .split(URL_REGEX)
            .filter((fragment) => fragment.trim() !== '')

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
            { rootMargin: '4000px' },
        )
        if (containerRef) viewObserver.observe(containerRef)
        onCleanup(() => viewObserver.disconnect())
    })

    const months = [
        'January',
        'Febuary',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
    ]

    return (
        <div
            ref={containerRef}
            class="group bg-element hover:bg-element-accent border-element-accent flex w-full flex-col items-start gap-2 rounded border p-4"
        >
            <Show when={inView()}>
                <div class="flex flex-col flex-wrap gap-2">
                    <div class="flex w-full justify-between">
                        <Show when={data.archiveId != defaultArchiveId}>
                            <span class="text-sub text-md w-full pr-1 font-bold tracking-tight">
                                [{' '}
                                {
                                    archives()[data.archiveId || ('' as any)]
                                        ?.name
                                }{' '}
                                ]
                            </span>
                        </Show>
                        <span class="text-sub text-xs font-semibold tracking-wider">
                            {(() => {
                                const timestamp = data.timestamp
                                let timeSuffix: 'am' | 'pm' = 'am'
                                let hour = timestamp.getHours()
                                if (hour > 12) {
                                    hour -= 12
                                    timeSuffix = 'pm'
                                }
                                return `${timestamp.getFullYear()} ${months[timestamp.getMonth()]} ${timestamp.getDate()}, at ${hour}:${timestamp.getMinutes()}${timeSuffix.toUpperCase()}`
                            })()}
                        </span>
                    </div>
                    <span class="tracking text-4xl font-black">
                        {data.title}
                    </span>
                </div>
                <span class="text-element-accent-highlight flex flex-col gap-2 text-sm whitespace-pre-line">
                    <For each={contentParts()}>
                        {(text) => {
                            if (!text.match(URL_REGEX))
                                return <span>{text}</span>
                            return <LinkPreview url={text} />
                        }}
                    </For>
                </span>
                <Show when={data.tagIds.length > 0}>
                    <Line class="bg-element-accent h-1 w-full" />
                    <div class="flex flex-wrap items-center gap-2 text-wrap">
                        <For each={data.tagIds}>
                            {(tagId) => {
                                const tagData = tags()[tagId]
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
