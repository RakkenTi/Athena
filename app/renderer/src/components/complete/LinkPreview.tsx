import {
    createEffect,
    createResource,
    createSignal,
    onCleanup,
    onMount,
    Show,
    type Component,
    type ComponentProps,
} from 'solid-js'
import { getApi } from '../../modules/ipc_client'
import {
    URL_DOMAIN_REGEX,
    URL_MAIN_DOMAIN_REGEX,
    YOUTUBE_ID_REGEX,
} from '../../modules/regex'
import { linkPreviewCache, setLinkPreviewCache } from '../../modules/data'

interface LinkPreviewProps extends ComponentProps<'div'> {
    url: string
}

// Replace certain siteLinks with custom ones
const siteMap: Array<{
    target: string
    replaceWith: string
}> = [
    {
        target: 'cdn.discordapp.com',
        replaceWith: 'Discord',
    },
]

export const LinkPreview: Component<LinkPreviewProps> = (props) => {
    let containerRef: HTMLDivElement | undefined
    const [inView, setInView] = createSignal<boolean>(false)

    onMount(() => {
        const viewObserver = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true)
                } else {
                    setInView(false)
                }
            },
            { rootMargin: '4000px' },
        )
        if (containerRef) viewObserver.observe(containerRef)
        onCleanup(() => viewObserver.disconnect())
    })

    const [websiteData] = createResource(
        () => (inView() ? props.url : null),
        async (url) => {
            console.log('Attempting to get data for: ', props.url)
            const cache = linkPreviewCache()

            if (cache && cache[props.url]) {
                console.log('Loading cached data for link preview.')
                return cache[props.url]
            }

            const api = getApi()
            if (!api) {
                console.log(`No api found. Returning`)
                return null
            }
            const result = await api.scrapeWebsiteData(url)
            console.log(
                'Fetched link preview data for the first time. Saving to cache.',
            )
            setLinkPreviewCache((prev) => ({
                ...prev,
                [props.url]: result,
            }))
            return result
        },
    )

    const getVideoLink = (url: string) => {
        const match = url.match(YOUTUBE_ID_REGEX)
        const id = match?.groups?.id

        if (!match || !id) {
            return null
        }

        return `https://www.youtube-nocookie.com/embed/${id}?autoplayer=0`
    }

    const openDirectImage = (url?: string) => {
        console.log(`Opening ${url}`)
        window.open(url)
    }

    const filterTitle = (title?: string) => {
        let name = title
        for (const { target, replaceWith } of siteMap) {
            if (!name) return ''
            if (name.toLowerCase().match(target.toLowerCase())) {
                name = replaceWith
            }
        }

        const match =
            title?.match(URL_MAIN_DOMAIN_REGEX) ||
            title?.match(URL_DOMAIN_REGEX)

        if (match?.groups?.domain) {
            const domainName =
                match.groups.domain.charAt(0).toUpperCase() +
                match.groups.domain.slice(1)
            if (domainName) return domainName
        }

        return name || ''
    }

    const videoLink = () => getVideoLink(props.url)

    createEffect(() => {
        console.log(`Website data for ${props.url}:`, websiteData())
    })

    const hasMediaData = () => {
        return websiteData() && (websiteData()?.image || websiteData()?.video)
    }

    return (
        <div
            ref={containerRef}
            class={`bg-highlight border-sub hover:border-highlight-strongest flex ${hasMediaData() ? 'min-h-20 p-2' : 'p-1'} w-full flex-col justify-center gap-1 rounded border-2 transition-all duration-300`}
        >
            <Show
                when={hasMediaData() && inView()}
                fallback={
                    <div
                        onClick={() => getApi().openExternalBrowser(props.url)}
                        class="group bg-element-accent border-sub hover:border-highlight-strongest flex flex-col rounded border p-2 hover:cursor-pointer"
                    >
                        <div class="flex w-full justify-between">
                            <span class="text-highlight-strong group font-black">
                                {websiteData()?.title || props.url}
                            </span>
                            <span class="text-element-accent-highlight group font-black">
                                No Media Data
                            </span>
                        </div>
                    </div>
                }
            >
                <div class="flex justify-between">
                    <div class="flex min-w-0 items-center gap-3 pr-2">
                        <img
                            src={`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${props.url}`}
                        />
                        <span class="text-highlight-alt-strong flex-1 truncate text-lg font-black">
                            {filterTitle(websiteData()?.title)}
                        </span>
                    </div>
                    <button
                        onClick={() => getApi().openExternalBrowser(props.url)}
                        class="hover:text-highlight-strongest text-highlight-strong text-md text-right font-black tracking-widest whitespace-nowrap transition-all duration-100 hover:scale-105 hover:cursor-pointer active:scale-95"
                    >
                        {`${websiteData()?.siteLink ? `[${websiteData()?.siteLink}]` : ''}`}
                    </button>
                </div>
                <Show when={!videoLink() && !websiteData()?.video}>
                    <img
                        onClick={() => openDirectImage(websiteData()?.image)}
                        class="border-highlight-alt-strongest transition-all duration-200 hover:cursor-pointer hover:border-2"
                        src={`${websiteData()?.image || ''}`}
                    />
                </Show>
                <Show when={videoLink() || websiteData()?.video}>
                    {(link) => {
                        const videoSource = websiteData()?.video
                        if (videoSource && !videoLink()) {
                            return (
                                <video
                                    class="aspect-video w-full rounded"
                                    controls
                                >
                                    <source
                                        src={videoSource}
                                        type="video/mp4"
                                    />
                                    Your browser does not support the video tag.
                                </video>
                            )
                        }
                        if (videoLink()) {
                            console.log(`Displaying ${link()} as iframe.`)
                            return (
                                <iframe
                                    loading="lazy"
                                    class="aspect-video h-full w-full"
                                    src={link() as string}
                                    title="YouTube video player"
                                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    referrerpolicy="strict-origin-when-cross-origin"
                                    allowfullscreen
                                ></iframe>
                            )
                        }
                    }}
                </Show>
                <div class="flex justify-between">
                    <span class="text-element-accent-highlight line-clamp-3 text-sm italic">{`${websiteData()?.description || ''}`}</span>
                </div>
            </Show>
        </div>
    )
}
