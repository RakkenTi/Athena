// strictly only persistent data should be handled here.
// temporary data should be part of globals.

import { batch, createEffect, createRoot, createSignal } from 'solid-js'
import { getApi } from './ipc_client'
import type { IpcApi } from '../../../main/src/types/APISchema'
import {
    extractBaseURL,
    extractContentParts as extractContentPartsFromContent,
    generateVibrantColour,
    iterateUrlsInContentParts,
    registerMediaFilter,
} from './globals'
import { version } from '../../../../package.json'
import { createStore, unwrap } from 'solid-js/store'
import { migrateOldData } from './data_migrate'

// Constants
export const BeginningOfTime = new Date()
export const EndOfTime = new Date()

BeginningOfTime.setTime(0)
EndOfTime.setUTCFullYear(9999)

const log_header = '-'.repeat(25)

// Reference Files
export type FileName = string
export type FileRefs = Record<string, File>
export const [refFiles, setRefFiles] = createSignal<FileRefs>({})

// Link Previews
// url: metadata
export const [linkPreviewCache, setLinkPreviewCache] = createSignal<
    Record<string, Awaited<ReturnType<typeof IpcApi.scrapeWebsiteData>>>
>({})

// Moment Creator
export const [title, setTitle] = createSignal<string>('')
export const [content, setContent] = createSignal<string>('')
export const [tagsString, setTagsString] = createSignal<string>('')

// Moments
export interface MomentData {
    uuid: MomentId
    title: string
    content: string
    archiveId: ArchiveId | undefined
    timestamp: Date
    tagIds: Array<TagId>
}
export type MomentId = `moment_${string}`
export const [allMoments, setAllMoments] = createStore<
    Record<MomentId, MomentData>
>({})

// Archives
export const defaultArchiveId = '_default_archive_' as ArchiveId
export const defaultArchiveName = '__GENERAL__'
export type ArchiveId = `archive_${string}`
export interface Archive {
    uuid: ArchiveId
    name: string
    momentsIds: Array<MomentId>
}
export const [archives, setArchives] = createSignal<Record<ArchiveId, Archive>>(
    {},
) // archiveName: Moment ID array
export const [selectedArchiveId, setSelectedArchive] =
    createSignal<ArchiveId>(defaultArchiveId)

// Tags
export type TagId = `tag_${string}`
export const [selectedTagIds, setSelectedTagIds] = createSignal<Array<TagId>>(
    [],
)
export type Tags = Record<TagId, Tag>
export interface Tag {
    id: TagId
    name: string
    colour: string
    refCount: number
}
export const [allTags, setAllTags] = createStore<Record<TagId, Tag>>({}) // tag_id: tag

// Filters
export const [dateFilter, setDateFilter] = createSignal<{
    start: Date
    end: Date
}>({ start: BeginningOfTime, end: EndOfTime })

// Loading, must happen at least once before saving!
let isLoaded = false

const loadData = async () => {
    isLoaded = false

    const migratedData = await migrateOldData()
    const readData: DataSnapshot = migratedData || (await getApi().readData())

    // update default archive
    if (readData.archives) {
        readData.archives[defaultArchiveId].name = defaultArchiveName
    }

    console.log(log_header)
    console.log('Loading data:', readData)

    if (readData.linkPreviewCache) {
        setLinkPreviewCache(readData.linkPreviewCache)
        console.log('Loaded link previews.')
    } else {
        console.error(`No link preview cache.`)
    }

    if (readData.archives) {
        setArchives(readData.archives)
        console.log('Loaded archives.')
    } else {
        console.error('No archives!')
    }

    // Important to load tags before moments as moments depend on tags
    if (readData.tags) {
        setAllTags(readData.tags)
        console.log('Loaded tags.')
    } else {
        console.error('No tags!')
    }

    if (readData.moments) {
        const rawMoments = readData.moments as Record<string, MomentData>
        const moments = {} as Record<string, MomentData>
        for (const [id, moment] of Object.entries(rawMoments)) {
            moment.timestamp = new Date(new Date(moment.timestamp).getTime())
            moments[id] = moment
        }
        console.log('Loaded moments.')
        setAllMoments(moments)
    } else {
        console.error('No moments!')
    }

    isLoaded = true
    console.log('Loaded Data!')
    console.log(log_header)
}

loadData()

// Saving
const createDebounce = (
    callback: (...args: any) => any,
    timeoutDuration: number,
) => {
    let timeoutId: number | undefined

    return (...args: Array<any>) => {
        if (timeoutId) {
            window.clearTimeout(timeoutId)
        }
        timeoutId = window.setTimeout(() => {
            callback(...args)
        }, timeoutDuration)
    }
}

// Data saving
let lastSavedString = ''

export interface DataSnapshot {
    version: string
    archives: ReturnType<typeof archives>
    moments: typeof allMoments
    tags: typeof allTags
    linkPreviewCache: ReturnType<typeof linkPreviewCache>
}

const writeSave = createDebounce((snapshot: DataSnapshot) => {
    getApi().writeMainData(snapshot)
    console.log('Saved Data!')
}, 250)

createRoot(() => {
    createEffect(() => {
        JSON.stringify(allMoments)
        JSON.stringify(allTags)
        if (!isLoaded) return
        const snapshot: DataSnapshot = {
            version,
            archives: archives(),
            moments: unwrap(allMoments),
            tags: unwrap(allTags),
            linkPreviewCache: linkPreviewCache(),
        }

        const savedDataString = JSON.stringify(snapshot)

        console.log('Snapshot to save:', snapshot)
        if (lastSavedString == savedDataString) return
        lastSavedString = savedDataString
        writeSave(snapshot)
    })
})

// Data operations
// Archives
export const createArchive = (archiveName: string) => {
    const allArchives = { ...archives() }
    console.log(archives())
    for (const [_, archiveData] of Object.entries(allArchives)) {
        if (archiveName == archiveData.name) {
            return
        }
    }
    const newArchiveId: ArchiveId = `archive_${window.crypto.randomUUID()}`
    const newArchive: Archive = {
        name: archiveName,
        uuid: newArchiveId,
        momentsIds: [],
    }
    allArchives[newArchiveId] = newArchive
    setArchives(allArchives)
    return true
}

export const updateArchive = (
    archiveId: ArchiveId,
    changes: Partial<Omit<Archive, 'uuid'>>,
) => {
    setArchives((prev) => ({
        ...prev,
        [archiveId]: {
            ...prev[archiveId],
            ...changes,
        },
    }))
}

export const deleteArchive = (archiveId: ArchiveId) => {
    batch(() => {
        if (selectedArchiveId() == archiveId) {
            setSelectedArchive(defaultArchiveId)
        }

        const allArchives = { ...archives() }
        const archiveData = allArchives[archiveId]
        const momentIds = archiveData.momentsIds

        for (const momentId of momentIds) {
            setAllMoments(momentId, 'archiveId', defaultArchiveId)
        }

        delete allArchives[archiveId]

        setArchives(allArchives)
    })
}

// Editing Moments
export const [editingMoment, setEditingMoment] = createSignal<
    MomentId | undefined
>()

// Deleting Moments
export const [momentToDelete, setMomentToDelete] = createSignal<
    MomentId | undefined
>()

// Moments
export const createMoment = (data: Omit<MomentData, 'uuid'>) => {
    const newMomentId: MomentId = `moment_${window.crypto.randomUUID()}`
    const newMoment: MomentData = {
        ...data,
        uuid: newMomentId,
    }
    const targetArchiveId = data.archiveId || defaultArchiveId

    batch(() => {
        data.tagIds.forEach((id) => {
            if (allTags[id]) setAllTags(id, 'refCount', (v) => v + 1)
        })

        setAllMoments(newMomentId, newMoment)

        setArchives((prev) => {
            const targetArchiveData = prev[targetArchiveId]
            if (targetArchiveId == defaultArchiveId) {
                return prev
            }

            const newMomentIds = [
                ...(targetArchiveData?.momentsIds || []),
                newMomentId,
            ]

            return {
                ...prev,
                [targetArchiveId]: {
                    ...targetArchiveData,
                    momentsIds: newMomentIds,
                },
            }
        })
    })
    return true
}

export const updateMoment = (
    momentId: MomentId,
    changes: Partial<Omit<MomentData, 'uuid'>>,
) => {
    const oldMoment = allMoments[momentId]
    const newTagIds = changes.tagIds
    if (!oldMoment) return

    if (newTagIds) {
        const oldIds = oldMoment.tagIds

        // Update Media Filters
        subtractMediaFiltersFromContent(oldMoment.content)
        const newContent = changes.content
        if (newContent) {
            const contentParts = extractContentPartsFromContent(newContent)
            iterateUrlsInContentParts(contentParts, (url) => {
                const baseUrl = extractBaseURL(url)
                if (!baseUrl) return
                registerMediaFilter(baseUrl)
            })
        }

        // Update tags
        const removed = oldIds.filter((id) => !newTagIds.includes(id))
        const added = newTagIds.filter((id) => !oldIds.includes(id))

        removed.forEach((id) => {
            if (!allTags[id]) return
            const newCount = allTags[id].refCount - 1
            if (newCount <= 0) {
                setAllTags(id, undefined!)
                // remove from selected tags
                setSelectedTagIds((prev) => prev.filter((tagId) => tagId != id))
            } else {
                setAllTags(id, 'refCount', newCount)
            }
        })

        added.forEach((id) => {
            if (!allTags[id]) return
            // increase ref count. used for auto tag deletion
            setAllTags(id, 'refCount', (v) => v + 1)
        })
    }

    setAllMoments(momentId, changes)

    return true
}

const subtractMediaFiltersFromContent = (content: string) => {
    // Delete media filters that are no longer attached to any moments.
    const contentParts = extractContentPartsFromContent(content)
    iterateUrlsInContentParts(contentParts, (url) => {
        const baseUrl = extractBaseURL(url)
        if (!baseUrl) return
        if (mediaFilters[baseUrl]) {
            const newValue = mediaFilters[baseUrl].refCount - 1
            setMediaFilters(baseUrl, 'refCount', newValue)
            console.log('Removed!', newValue)
            if (newValue <= 0) {
                setMediaFilters(baseUrl, undefined!)
            }
        }
    })
}

export const deleteMoment = (uuid: MomentId) => {
    const momentToDelete = allMoments[uuid]
    if (!momentToDelete) {
        console.warn('Moment does not exist! Cannot delete.')
        return
    }
    console.log(`To delete: ${uuid}`)
    const archiveId = allMoments[uuid].archiveId

    setAllMoments(uuid, undefined!)

    setArchives((prev) => {
        const result = { ...prev }
        if (archiveId && archiveId != defaultArchiveId && result[archiveId]) {
            result[archiveId].momentsIds = result[archiveId].momentsIds.filter(
                (momentId) => momentId != uuid,
            )
        }
        return result
    })

    // Delete tags that are no longer attached to any moments
    for (const id of momentToDelete.tagIds) {
        const newCount = allTags[id].refCount - 1
        if (newCount <= 0) {
            console.log('Deleting:', allTags[id].name)
            setAllTags(id, undefined!)
        } else {
            setAllTags(id, 'refCount', newCount)
        }
    }

    subtractMediaFiltersFromContent(momentToDelete.content)

    return true
}

// Media Filters
// url:nickname
export interface MediaFilter {
    url: string
    nickname: string
    refCount: number
}
export type url = string // https://google.com but also https://google.com/asgh3qd12rwqd
export type baseUrlString = string // like https://google.com and not https://google.com/129uiyd81u
export const [mediaFilters, setMediaFilters] = createStore<
    Record<baseUrlString, MediaFilter>
>({})

export const [selectedURLFilters, setSelectedURLFilters] = createSignal<
    Array<string>
>([])

// Tags
export const registerTags = (newTags: Array<string>): Array<TagId> => {
    // removes duplicate entries
    const transformedNames = new Array(
        ...new Set(
            newTags
                .map((tagName) => tagName.toUpperCase().trim())
                .filter((name) => name.length > 0),
        ),
    )

    const resultIds: Array<TagId> = []

    batch(() => {
        const nameIdMap = new Map(
            Object.values(unwrap(allTags)).map((tagData) => [
                tagData.name, // key
                tagData.id, // value
            ]),
        )

        transformedNames.forEach((name) => {
            const alreadyExistingTagId = nameIdMap.get(name)
            if (alreadyExistingTagId) {
                resultIds.push(alreadyExistingTagId)
                return
            }
            const newTagId: TagId = `tag_${window.crypto.randomUUID()}`
            const tagData: Tag = {
                name,
                id: newTagId,
                colour: generateVibrantColour(),
                refCount: 0,
            }
            resultIds.push(newTagId)
            setAllTags(newTagId, tagData)
        })
    })

    return resultIds
}

export const updateTag = (tagId: TagId, changes: Partial<Omit<Tag, 'id'>>) => {
    if (!allTags[tagId]) {
        console.warn('Tried to rename non-existing tag.')
        return
    }

    setAllTags(tagId, {
        ...changes,
    })

    return true
}

export const renameTag = (tagId: TagId, newTagName: string) => {
    updateTag(tagId, {
        name: newTagName,
    })

    return true
}

export const recolourTag = (tagId: TagId, newTagColour: string) => {
    updateTag(tagId, {
        colour: newTagColour,
    })

    return true
}

// File References
export const saveFileReference = async (
    file: File,
    selection: {
        Start?: number
        End?: number
    },
) => {
    const currentDate = new Date().getTime()
    const fileName = `attachment_${file.name || currentDate}`
    const placeholder = `[Attaching ${fileName}...]`

    const startPos = selection.Start ?? content().length
    const endPos = selection.End ?? content().length

    setContent(
        (prev) =>
            prev.substring(0, startPos) + placeholder + prev.substring(endPos),
    )

    try {
        const rawData = await file.arrayBuffer()
        const localUri = await getApi().saveFileRef(rawData, fileName)

        if (localUri) {
            setContent((prev) => prev.replace(placeholder, `${localUri} `))
            setRefFiles((prev) => ({ ...prev, [localUri]: file }))
        }
    } catch (error) {
        console.error(`Failed to attach a file!: `, error)
        setContent((prev) =>
            prev.replace(placeholder, `[ERROR! Failed to attach ${fileName}]`),
        )
        return null
    }
}
