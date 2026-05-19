import hljs from 'highlight.js'
import 'highlight.js/styles/atom-one-dark.css'
import {
    createMemo,
    createResource,
    createSignal,
    Match,
    onCleanup,
    onMount,
    Show,
    Switch,
    createEffect,
    type Component,
    type ComponentProps,
} from 'solid-js'
import { getApi } from '../modules/ipc_client'
import {
    FILE_REF_REGEX,
    URL_DOMAIN_REGEX,
    URL_MAIN_DOMAIN_REGEX,
    URL_REGEX,
    YOUTUBE_ID_REGEX,
} from '../modules/regex'
import {
    InspectImage,
    linkPreviewCache,
    setLinkPreviewCache,
} from '../modules/data'
import {
    fixedIconClasses,
    imageExtensions,
    maxImageHeight,
    rootMarginPixels,
    siteMap,
} from '../modules/globals'
import { LocalPDFPreview } from './PDFPreview'
import { unwrap } from 'solid-js/store'

interface AttachmentPreviewProps extends ComponentProps<'div'> {
    link: string
}

const getGithubRawUrl = (url: string) => {
    if (url.startsWith('https://raw.githubusercontent.com/')) return url
    const match = url.match(
        /^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)$/,
    )
    if (match) {
        return `https://raw.githubusercontent.com/${match[1]}/${match[2]}/${match[3]}/${match[4]}`
    }
    return null
}

const SmartImage: Component<{
    src: string
    class?: string
    onClick?: () => void
}> = (props) => {
    let imgRef: HTMLImageElement | undefined
    const [isLoaded, setIsLoaded] = createSignal(false)
    const [hasError, setHasError] = createSignal(false)
    const [retryKey, setRetryKey] = createSignal(0)

    const dims = () => linkPreviewCache.dimensions[props.src]

    const handleLoad = () => {
        if (!imgRef) return

        if (imgRef.naturalWidth > 0 && imgRef.naturalHeight > 0) {
            setLinkPreviewCache('dimensions', props.src, {
                width: imgRef.naturalWidth,
                height: imgRef.naturalHeight,
            })
            setHasError(false)
            setIsLoaded(true)
        } else {
            setHasError(true)
            setIsLoaded(true)
        }
    }

    const attemptRefetch = () => {
        setHasError(false)
        setIsLoaded(false)
        setRetryKey((k) => k + 1)
    }

    onMount(() => {
        if (imgRef && imgRef.complete) handleLoad()

        const handleOnline = () => {
            if (hasError()) {
                attemptRefetch()
            }
        }

        window.addEventListener('online', handleOnline)
        onCleanup(() => window.removeEventListener('online', handleOnline))
    })

    const currentSrc = () => {
        if (retryKey() === 0) return props.src
        const separator = props.src.includes('?') ? '&' : '?'
        return `${props.src}${separator}retry=${retryKey()}`
    }

    return (
        <div
            class={`relative z-10 flex w-full items-center justify-center overflow-hidden transition-all duration-300 ${props.class || ''} ${!dims() ? 'min-h-37.5' : ''}`}
            style={{
                'aspect-ratio': dims()
                    ? `${dims()!.width} / ${dims()!.height}`
                    : undefined,
            }}
        >
            <Show when={!isLoaded() && !hasError()}>
                <div class="bg-element-accent absolute inset-0 flex animate-pulse items-center justify-center rounded">
                    <i class="fa-solid fa-image text-sub/30 text-3xl"></i>
                </div>
            </Show>

            <Show when={hasError()}>
                <div
                    onClick={(e) => {
                        e.stopPropagation()
                        attemptRefetch()
                    }}
                    class="bg-element-matte border-element-accent absolute inset-0 flex cursor-pointer flex-col items-center justify-center rounded border border-dashed p-4"
                >
                    <i class="fa-solid fa-link-slash text-sub/50 mb-2 text-2xl"></i>
                    <span class="text-sub/50 text-center text-xs font-bold">
                        Failed to load preview.
                    </span>
                    <button
                        onClick={(e) => {
                            e.stopPropagation()
                            attemptRefetch()
                        }}
                        class="text-highlight mt-2 text-xs font-bold hover:underline"
                    >
                        Retry
                    </button>
                </div>
            </Show>

            <img
                ref={imgRef}
                src={currentSrc()}
                onClick={props.onClick}
                onLoad={handleLoad}
                onError={() => {
                    setHasError(true)
                    setIsLoaded(true)
                }}
                class={`h-full w-full object-contain transition-opacity duration-300 ${
                    isLoaded() && !hasError()
                        ? 'opacity-100'
                        : 'pointer-events-none absolute opacity-0'
                }`}
            />
        </div>
    )
}

export const AttachmentPreview: Component<AttachmentPreviewProps> = (props) => {
    const isFile = () => props.link.match(FILE_REF_REGEX)
    const isURL = () => props.link.match(URL_REGEX)
    const isPDF = () => {
        return !!props.link.match(/\.(pdf)(\?.*)?$/i)
    }

    let containerRef: HTMLDivElement | undefined
    const [inView, setInView] = createSignal<boolean>(false)

    const cleanUrl = () => (props.link || '').trim()

    const isDirectMedia = (url: string) => {
        if (!url) return false
        return (
            url.startsWith('blob:') ||
            url.startsWith('file://') ||
            url.startsWith('athena://') ||
            url.includes('/uploads/') ||
            !!url.match(
                /\.(jpeg|jpg|gif|png|webp|svg|heic|mp4|webm|mov|ogg|mkv)(\?.*)?$/i,
            )
        )
    }

    const isVideoFile = (url: string) => {
        return !!url.match(/\.(mp4|webm|mov|ogg|mkv)(\?.*)?$/i)
    }

    onMount(() => {
        const viewObserver = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setInView(true)
                } else {
                    setInView(false)
                }
            },
            { rootMargin: `${rootMarginPixels}px` },
        )
        if (containerRef) viewObserver.observe(containerRef)
        onCleanup(() => viewObserver.disconnect())
    })

    const shouldFetch = () => {
        const url = cleanUrl()
        if (!url) return null
        if (isDirectMedia(url)) return url
        if (unwrap(linkPreviewCache).metadata[url]) return url
        return inView() ? url : null
    }

    const [websiteData] = createResource(
        shouldFetch,
        async (url) => {
            console.log('Attempting to get data for: ', url)
            const cache = unwrap(linkPreviewCache)
            let forceScrape = false

            if (isDirectMedia(url)) {
                console.log('Is raw media!')
                let displayTitle = 'Media File'
                let displayLink = 'Local Media'

                if (url.startsWith('blob:')) {
                    displayLink = 'Local Unsaved Blob'
                } else if (url.includes('/uploads/')) {
                    displayLink = 'Athena Server'
                    const filename = url.split('/').pop() || 'Media'
                    displayTitle = filename.includes('_')
                        ? filename.split('_').slice(1).join('_')
                        : filename
                }

                const isVideo = isVideoFile(url)

                return {
                    title: displayTitle,
                    siteLink: displayLink,
                    image: isVideo ? '' : url,
                    description: '',
                    video: isVideo ? url : '',
                }
            }

            if (cache && cache.metadata[url]) {
                const cachedData = cache.metadata[url]
                if (cachedData.image == '' && cachedData.video == '') {
                    forceScrape = true
                    console.warn(
                        `Cached data for ${url} has no image or video. Ignoring cached data.`,
                    )
                } else {
                    console.log('Loading cached data for link preview.')
                    return cachedData
                }
            }

            const api = getApi()
            if (!api) {
                console.log(`No api found. Returning`)
                return null
            }
            console.log(`Attempting to scrape ${url}`)
            const result = await api.scrapeWebsiteData(url, forceScrape)
            setLinkPreviewCache('metadata', url, result)
            return result
        },
        { initialValue: unwrap(linkPreviewCache).metadata[cleanUrl()] },
    )

    const githubRawUrl = createMemo(() => getGithubRawUrl(cleanUrl()))
    let githubCodeRef: HTMLElement | undefined

    const [githubCode] = createResource(
        () => (inView() && githubRawUrl() ? githubRawUrl() : null),
        async (rawUrl) => {
            if (!rawUrl) return null
            try {
                const res = await fetch(rawUrl)
                if (!res.ok) return null
                return await res.text()
            } catch (e) {
                console.error('Failed to fetch github raw code', e)
                return null
            }
        },
    )

    createEffect(() => {
        if (
            githubCode() &&
            githubCodeRef &&
            !githubCodeRef.classList.contains('hljs')
        ) {
            hljs.highlightElement(githubCodeRef)
        }
    })

    const getVideoLink = (url: string) => {
        const match = url.match(YOUTUBE_ID_REGEX)
        const id = match?.groups?.id

        if (!match || !id) {
            return null
        }

        return `https://www.youtube-nocookie.com/embed/${id}?autoplay=0`
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

    const videoLink = () => getVideoLink(cleanUrl())

    const hasMediaData = () => {
        return websiteData() && (websiteData()?.image || websiteData()?.video)
    }

    const extension = createMemo(
        () => props.link.split('.').pop()?.toLowerCase() || '',
    )
    const isImage = createMemo(() => {
        return imageExtensions.includes(extension())
    })

    const [fileName] = createResource(() =>
        getApi().getFileNameFromURI(props.link),
    )

    return (
        <div class="my-4">
            <Switch>
                <Match when={isFile()}>
                    <div>
                        <div class="group bg-highlight border-sub hover:border-highlight-strongest flex w-full flex-col justify-center gap-1 rounded border-2 transition-all duration-300">
                            <Switch
                                fallback={
                                    <div
                                        onClick={() =>
                                            getApi().openFileFromURI(props.link)
                                        }
                                        class="group flex w-full items-center justify-between gap-2 p-2 group-hover:cursor-pointer"
                                    >
                                        <span class="text-highlight-alt-strong text-lg font-black">
                                            File
                                        </span>
                                        <span class="text-highlight-strong text-xs font-bold">
                                            {fileName()}
                                        </span>
                                    </div>
                                }
                            >
                                <Match when={isImage()}>
                                    <div
                                        class="hover:cursor-pointer"
                                        onClick={() => {
                                            const url = props.link
                                            if (url) {
                                                InspectImage(url)
                                            }
                                        }}
                                    >
                                        <div class="flex w-full flex-col gap-2 p-2">
                                            <span class="text-highlight-alt-strong text-lg font-black">
                                                Local Image
                                            </span>
                                            <div class="border-highlight-alt bg-element-matte group relative flex w-full items-center justify-center overflow-hidden rounded-xl border">
                                                <div
                                                    class="pointer-events-none absolute inset-0 scale-150 opacity-40 blur-xl transition-all group-hover:opacity-60"
                                                    style={{
                                                        'background-image': `url(${props.link || ''})`,
                                                        'background-size':
                                                            'cover',
                                                        'background-position':
                                                            'center',
                                                    }}
                                                />
                                                <SmartImage
                                                    src={props.link}
                                                    class={`bg-element z-10 ${maxImageHeight()} w-full rounded object-contain hover:cursor-pointer`}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </Match>
                                <Match when={isPDF()}>
                                    <div
                                        class="hover:cursor-pointer"
                                        onClick={() => {
                                            getApi().openFileFromURI(props.link)
                                        }}
                                    >
                                        <LocalPDFPreview url={props.link} />
                                    </div>
                                </Match>
                            </Switch>
                        </div>
                    </div>
                </Match>
                <Match when={isURL()}>
                    <div ref={containerRef} class="w-full">
                        <Show
                            when={githubRawUrl()}
                            fallback={
                                <div
                                    class={`bg-highlight border-sub hover:border-highlight-strongest flex ${hasMediaData() ? 'min-h-20 p-2' : 'p-1'} w-full flex-col justify-center gap-1 rounded border-2 transition-all duration-300`}
                                >
                                    <Show
                                        when={hasMediaData()}
                                        fallback={
                                            <div
                                                onClick={() =>
                                                    getApi().openExternalBrowser(
                                                        cleanUrl(),
                                                    )
                                                }
                                                class="group bg-element-accent border-sub hover:border-highlight-strongest flex flex-col rounded border p-2 hover:cursor-pointer"
                                            >
                                                <div class="flex w-full justify-between gap-2">
                                                    <span class="text-highlight-strong group font-black break-all">
                                                        {websiteData()?.title ||
                                                            cleanUrl()}
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
                                                <Show
                                                    when={
                                                        !isDirectMedia(
                                                            cleanUrl(),
                                                        )
                                                    }
                                                    fallback={
                                                        <div class="bg-element text-sub flex h-5 w-5 items-center justify-center rounded text-lg">
                                                            <i
                                                                class={
                                                                    fixedIconClasses +
                                                                    (isVideoFile(
                                                                        cleanUrl(),
                                                                    )
                                                                        ? 'fa-file-video'
                                                                        : 'fa-image')
                                                                }
                                                            />
                                                        </div>
                                                    }
                                                >
                                                    <img
                                                        class={`bg-element ${maxImageHeight()} rounded object-contain`}
                                                        src={`https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${cleanUrl()}`}
                                                    />
                                                </Show>
                                                <span class="text-highlight-alt-strong flex-1 truncate text-lg font-black">
                                                    {filterTitle(
                                                        websiteData()?.title,
                                                    )}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() =>
                                                    getApi().openExternalBrowser(
                                                        cleanUrl(),
                                                    )
                                                }
                                                class="hover:text-highlight-strongest text-highlight-strong text-md wrap-break-all max-w-sm text-right font-black tracking-widest transition-all duration-100 hover:scale-105 hover:cursor-pointer active:scale-95"
                                            >
                                                {(() => {
                                                    const basic = websiteData()
                                                        ?.siteLink.match(
                                                            URL_MAIN_DOMAIN_REGEX,
                                                        )
                                                        ?.at(0)
                                                    if (basic) {
                                                        return basic
                                                    }
                                                    return (
                                                        websiteData()
                                                            ?.siteLink || ''
                                                    )
                                                })()}
                                            </button>
                                        </div>
                                        <Switch>
                                            <Match when={websiteData.loading}>
                                                <div class="bg-element min-h-25 w-full animate-pulse rounded"></div>
                                            </Match>
                                            <Match when={isPDF()}>
                                                <LocalPDFPreview
                                                    url={cleanUrl()}
                                                ></LocalPDFPreview>
                                            </Match>

                                            <Match
                                                when={!!websiteData()?.image}
                                            >
                                                <div class="border-highlight-alt bg-element-matte group relative flex w-full items-center justify-center overflow-hidden rounded-xl border">
                                                    <div
                                                        class="pointer-events-none absolute inset-0 scale-150 opacity-40 blur-xl transition-all group-hover:opacity-60"
                                                        style={{
                                                            'background-image': `url(${websiteData()?.image || ''})`,
                                                            'background-size':
                                                                'cover',
                                                            'background-position':
                                                                'center',
                                                        }}
                                                    />
                                                    <SmartImage
                                                        src={
                                                            websiteData()
                                                                ?.image || ''
                                                        }
                                                        onClick={() => {
                                                            const url =
                                                                websiteData()
                                                                    ?.image
                                                            if (url) {
                                                                InspectImage(
                                                                    url,
                                                                )
                                                            }
                                                        }}
                                                        class={`border-highlight-alt-strongest bg-element z-10 ${maxImageHeight()} rounded object-contain hover:cursor-pointer`}
                                                    />
                                                </div>
                                            </Match>

                                            <Match
                                                when={
                                                    videoLink() ||
                                                    websiteData()?.video
                                                }
                                            >
                                                {(link) => {
                                                    const videoSource =
                                                        websiteData()?.video
                                                    if (
                                                        videoSource &&
                                                        !videoLink()
                                                    ) {
                                                        return (
                                                            <video
                                                                ref={(video) =>
                                                                    (video.volume = 0.1)
                                                                }
                                                                class="aspect-video w-full rounded"
                                                                controls
                                                            >
                                                                <source
                                                                    src={
                                                                        videoSource
                                                                    }
                                                                />
                                                                Your browser
                                                                does not support
                                                                the video tag.
                                                            </video>
                                                        )
                                                    }
                                                    if (videoLink()) {
                                                        return (
                                                            <iframe
                                                                loading="lazy"
                                                                class="aspect-video h-full w-full"
                                                                src={
                                                                    link() as string
                                                                }
                                                                title="YouTube video player"
                                                                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                                referrerpolicy="strict-origin-when-cross-origin"
                                                                allowfullscreen
                                                            ></iframe>
                                                        )
                                                    }
                                                }}
                                            </Match>
                                        </Switch>
                                        <Show when={websiteData()?.description}>
                                            <div class="flex justify-between">
                                                <span class="text-element-accent-highlight line-clamp-3 text-sm italic">{`${websiteData()?.description || ''}`}</span>
                                            </div>
                                        </Show>
                                    </Show>
                                </div>
                            }
                        >
                            <div class="bg-element-matte border-element-accent hover:border-highlight relative my-2 flex w-full flex-col gap-2 rounded-xl border p-4 transition-all duration-300">
                                <Show when={githubCode.loading}>
                                    <div class="text-sub animate-pulse py-2 text-sm font-bold tracking-widest">
                                        <i class="fa-solid fa-circle-notch fa-spin mr-2"></i>
                                        FETCHING GITHUB FILE...
                                    </div>
                                </Show>
                                <Show when={githubCode()}>
                                    <div class="border-element-accent flex items-center justify-between border-b pb-2">
                                        <span class="text-highlight-strong flex items-center gap-2 font-mono text-sm font-bold">
                                            <i class="fa-brands fa-github text-lg"></i>
                                            {cleanUrl().split('/').pop()}
                                        </span>
                                        <button
                                            onClick={() =>
                                                getApi().openExternalBrowser(
                                                    cleanUrl(),
                                                )
                                            }
                                            class="text-sub hover:text-highlight-strongest text-xs font-bold tracking-widest transition-colors hover:cursor-pointer"
                                        >
                                            OPEN ON GITHUB
                                        </button>
                                    </div>
                                    <div class="group/code relative">
                                        <pre class="bg-element my-0 overflow-x-auto rounded p-4 text-sm">
                                            <code
                                                ref={githubCodeRef}
                                                class={`language-${cleanUrl().split('.').pop() || 'plaintext'} max-h-[30vh]`}
                                            >
                                                {githubCode()}
                                            </code>
                                        </pre>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                navigator.clipboard.writeText(
                                                    githubCode() || '',
                                                )
                                                const btn = e.currentTarget
                                                btn.innerText = 'COPIED!'
                                                btn.classList.replace(
                                                    'bg-element/80',
                                                    'bg-highlight-strong',
                                                )

                                                setTimeout(() => {
                                                    btn.innerText = 'COPY'
                                                    btn.classList.replace(
                                                        'bg-highlight-strong',
                                                        'bg-element/80',
                                                    )
                                                }, 2000)
                                            }}
                                            class="bg-highlight-matte/20 hover:bg-highlight-strongest text-sub hover:text-dark absolute top-8 right-8 rounded px-2 py-1 text-xs font-bold opacity-0 transition-all duration-200 group-hover/code:opacity-100"
                                        >
                                            COPY
                                        </button>
                                    </div>
                                </Show>
                            </div>
                        </Show>
                    </div>
                </Match>
            </Switch>
        </div>
    )
}
