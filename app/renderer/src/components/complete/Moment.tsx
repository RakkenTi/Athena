import {
    createEffect,
    For,
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
    selectedArchive,
    setAvailableUrlFiltersAndNicknames,
    tagColours,
} from '../../modules/data'

export interface Moment {
    title: string
    content: string
    archive: string | undefined
    timestamp: Date
    tags: Array<string>
}

export type MomentProps = Moment & ComponentProps<'div'>

export const Moment: Component<MomentProps> = (props) => {
    props.tags = props.tags.map((tag) => tag.toUpperCase())

    const contentParts = () => props.content.split(URL_REGEX)

    const isVisible = () => {
        return (
            selectedArchive()?.toUpperCase().trim() ===
                props.archive?.toUpperCase().trim() || !selectedArchive()
        )
    }

    // extract urls
    for (const text of contentParts()) {
        if (text.match(URL_REGEX)) {
            const match =
                text.match(URL_MAIN_DOMAIN_REGEX) ||
                text.match(URL_DOMAIN_REGEX)

            if (match && match.groups) {
                const domainName = match.groups.domain

                setAvailableUrlFiltersAndNicknames((prev) => ({
                    ...prev,
                    [match[0].toLowerCase()]: domainName.toUpperCase(),
                }))
            }
        }
    }

    createEffect(() => {
        if (isVisible()) {
        }
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
        <div class="xl bg-element border-element-accent flex w-full flex-col gap-2 rounded border p-4">
            <div class="flex flex-col flex-wrap gap-2">
                <div class="flex w-full justify-between">
                    <Show when={props.archive}>
                        <span class="text-sub text-md w-full pr-1 font-bold tracking-tight">
                            [ {props.archive} ]
                        </span>
                    </Show>
                    <span class="text-sub text-xs font-semibold tracking-wider">
                        {(() => {
                            const timestamp = props.timestamp
                            let timeSuffix: 'am' | 'pm' = 'am'
                            let hour = timestamp.getHours()
                            if (hour > 12) {
                                hour -= 12
                                timeSuffix = 'pm'
                            }
                            return `${timestamp.getFullYear()} ${months[timestamp.getMonth()]} ${timestamp.getDay()}, at ${hour}:${timestamp.getMinutes()}${timeSuffix.toUpperCase()}`
                        })()}
                    </span>
                </div>
                <span class="tracking text-4xl font-black">{props.title}</span>
            </div>
            <span class="text-element-accent-highlight flex flex-col gap-4 text-sm whitespace-pre-line">
                <For each={contentParts()}>
                    {(text) => {
                        if (!text.match(URL_REGEX)) return <p>{text}</p>
                        return <LinkPreview url={text} />
                    }}
                </For>
            </span>
            <Show when={props.tags.length > 0}>
                <Line class="bg-element-accent h-1 w-full" />
                <div class="flex flex-wrap items-center gap-2 text-wrap">
                    <For each={props.tags}>
                        {(tag) => {
                            const tagColour = tagColours()[tag]
                            return (
                                <span
                                    class={`text-dark tracking-tightest rounded-md px-2 py-1 text-center text-xs font-black break-all md:p-2`}
                                    style={`background-color: ${tagColour}`}
                                >
                                    #{tag}
                                </span>
                            )
                        }}
                    </For>
                </div>
            </Show>
        </div>
    )
}
