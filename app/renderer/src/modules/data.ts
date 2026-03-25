import { createEffect, createRoot, createSignal } from 'solid-js'
import type { Moment } from '../components/complete/Moment'
import { getApi } from './ipc_client'
import type { IpcApi } from '../../../main/src/types/APISchema'

// Constants
export const BeginningOfTime = new Date()
export const EndOfTime = new Date()

BeginningOfTime.setTime(0)
EndOfTime.setUTCFullYear(9999)

const log_header = '-'.repeat(25)

// Link Previews
// url: metadata
export const [linkPreviewCache, setLinkPreviewCache] = createSignal<
    Record<string, Awaited<ReturnType<typeof IpcApi.scrapeWebsiteData>>>
>({})

// Archives
export const [archives, setArchives] = createSignal<Array<string>>([])
export const [selectedArchive, setSelectedArchive] = createSignal<
    string | undefined
>(undefined)

// Tags
export const [tagColours, setTagColours] = createSignal<Record<string, string>>(
    {},
)
export const [tags, setTags] = createSignal<Array<string>>([])
export const [selectedTags, setSelectedTags] = createSignal<Array<string>>([])

// Feed
export const [title, setTitle] = createSignal<string>('')
export const [content, setContent] = createSignal<string>('')
export const [tagsString, setTagsString] = createSignal<string>('')
export const [allMoments, setAllMoments] = createSignal<Array<Moment>>([])

export const defaultArchive = 'GENERAL'

// Filters
export const [dateFilter, setDateFilter] = createSignal<{
    start: Date
    end: Date
}>({ start: BeginningOfTime, end: EndOfTime })

// url:nickname
export const [
    availableUrlFiltersAndNicknames,
    setAvailableUrlFiltersAndNicknames,
] = createSignal<Record<string, string>>({})

export const [selectedUrlFilters, setSelectedUrlFilters] = createSignal<
    Array<string>
>([])

// Loading, must happen at least once before saving!
let isLoaded = true

const loadData = async () => {
    isLoaded = false

    const readData = await getApi().readData()

    console.log(log_header)
    console.log('Loading data:', readData)

    if (readData.archives) {
        setArchives(readData.archives)
        console.log('Loaded archives.')
    } else {
        console.error('No archives!')
    }

    if (readData.linkPreviewCache) {
        setLinkPreviewCache(readData.linkPreviewCache)
        console.log('Loaded link previews.')
    } else {
        console.error(`No link preview cache.`)
    }

    // Important to load tags before moments as moments depend on tags
    if (readData.tags) {
        setTags([...readData.tags])
        console.log('Loaded tags.')
    } else {
        console.error('No tags!')
    }

    if (readData.tagColours) {
        setTagColours(readData.tagColours)
        console.log('Loaded tag colours.')
    } else {
        console.error('No tag colours!')
    }

    if (readData.moments) {
        const rawMoments = readData.moments as Array<Moment>
        for (const moment of rawMoments) {
            moment.timestamp = new Date(moment.timestamp)
        }
        console.log('Loaded moments.')
        setAllMoments(readData.moments)
    } else {
        console.error('No moments!')
    }

    isLoaded = true
    console.log('Loaded Data!')
    console.log(log_header)
}

if (!import.meta.env.DEV) {
    loadData()
}

// Saving
createRoot(() => {
    createEffect(() => {
        const snapshot = {
            archives: archives(),
            moments: allMoments(),
            tags: tags(),
            tagColours: tagColours(),
            linkPreviewCache: linkPreviewCache(),
        }

        console.log('Snapshot to save:', snapshot)

        if (!isLoaded) return
        getApi().writeData(snapshot)
        console.log('Saved Data!')
    })
})
