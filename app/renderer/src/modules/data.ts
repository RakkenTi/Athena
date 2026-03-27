import { batch, createEffect, createRoot, createSignal } from 'solid-js'
import { getApi } from './ipc_client'
import type { IpcApi } from '../../../main/src/types/APISchema'
import { generateVibrantColour } from './utils'
import { version } from '../../../../package.json'

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

// Moments
export interface MomentData {
    uuid: string
    title: string
    content: string
    archiveId: ArchiveId | undefined
    timestamp: Date
    tagIds: Array<TagId>
}
export type MomentId = `moment_${string}`
export const [allMoments, setAllMoments] = createSignal<
    Record<MomentId, MomentData>
>({})

// Archives
export const defaultArchiveId = '_default_archive_' as ArchiveId
export const defaultArchiveName = 'GENERAL'
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
export type Tags = Record<TagId, Tag>
export type TagId = `tag_${string}`
export interface Tag {
    id: TagId
    name: string
    colour: string
}
export const [tags, setTags] = createSignal<Record<TagId, Tag>>({}) // tag_id: tag
export const [selectedTagIds, setSelectedTagIds] = createSignal<Array<TagId>>(
    [],
) // tag id

// Feed
export const [title, setTitle] = createSignal<string>('')
export const [content, setContent] = createSignal<string>('')
export const [tagsString, setTagsString] = createSignal<string>('')

// Filters
export const [dateFilter, setDateFilter] = createSignal<{
    start: Date
    end: Date
}>({ start: BeginningOfTime, end: EndOfTime })

// url:nickname
export const [
    availableURLFiltersAndNicknames,
    setAvailableURLFiltersAndNicknames,
] = createSignal<Record<string, string>>({})

export const [selectedURLFilters, setSelectedURLFilters] = createSignal<
    Array<string>
>([])

// Loading, must happen at least once before saving!
let isLoaded = false

const loadData = async () => {
    isLoaded = false

    const readData = await getApi().readData()

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
        setTags(readData.tags)
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
const createDebounce = (callback: Function, timeoutDuration: number) => {
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

export interface dataSnapshot {
    version: string
    archives: ReturnType<typeof archives>
    moments: ReturnType<typeof allMoments>
    tags: ReturnType<typeof tags>
    linkPreviewCache: ReturnType<typeof linkPreviewCache>
}

const writeSave = createDebounce((snapshot: dataSnapshot) => {
    getApi().writeData(snapshot)
    console.log('Saved Data!')
}, 250)

createRoot(() => {
    createEffect(() => {
        const snapshot: dataSnapshot = {
            version,
            archives: archives(),
            moments: allMoments(),
            tags: tags(),
            linkPreviewCache: linkPreviewCache(),
        }

        if (!isLoaded) return
        console.log('Snapshot to save:', snapshot)
        writeSave(snapshot)
    })
})

// Data operations
// Archives
export const createArchive = (archiveName: string) => {
    const allArchives = { ...archives() }
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
        const _allMoments = { ...allMoments() }
        const archiveData = allArchives[archiveId]
        const momentIds = archiveData.momentsIds

        for (const momentId of momentIds) {
            console.log(momentId, 'DUDE')
            const newMomentData = {
                ..._allMoments[momentId],
                archiveId: defaultArchiveId,
            }
            _allMoments[momentId] = newMomentData
        }

        delete allArchives[archiveId]

        setArchives(allArchives)
        setAllMoments(_allMoments)
    })
}

// Moments
export const createMoment = (data: Omit<MomentData, 'uuid'>) => {
    const newMomentId = window.crypto.randomUUID()
    const newMoment: MomentData = {
        ...data,
        uuid: newMomentId,
    }
    const targetArchiveId = data.archiveId || defaultArchiveId

    batch(() => {
        setAllMoments((prev) => ({
            ...prev,
            [newMomentId]: newMoment,
        }))

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
    data: Partial<Omit<MomentData, 'uuid'>>,
) => {
    setAllMoments((prev) => ({
        ...prev,
        [momentId]: {
            ...prev[momentId],
            ...data,
        },
    }))
    return true
}

export const deleteMoment = (uuid: MomentId) => {
    const moment = allMoments()[uuid]
    if (!moment) {
        console.warn('Moment does not exist! Cannot delete.')
        return
    }
    const archiveId = allMoments()[uuid].archiveId

    setAllMoments((prev) => {
        const result = { ...prev }
        delete result[uuid]
        return result
    })

    setArchives((prev) => {
        const result = { ...prev }
        if (archiveId) {
            result[archiveId].momentsIds = result[archiveId].momentsIds.filter(
                (momentId) => momentId != uuid,
            )
        }
        return result
    })

    return true
}

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
        const currentTags = tags()

        const nameIdMap = new Map(
            Object.values(currentTags).map((tagData) => [
                tagData.name, // key
                tagData.id, // value
            ]),
        )

        const updatedTags: Tags = { ...currentTags }

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
            }
            resultIds.push(newTagId)
            updatedTags[newTagId] = tagData
        })

        setTags(updatedTags)
    })

    return resultIds
}

export const updateTag = (tagId: TagId, changes: Partial<Omit<Tag, 'id'>>) => {
    const allTags = tags()

    if (!allTags[tagId]) {
        console.warn('Tried to rename non-existing tag.')
        return
    }

    setTags({
        ...allTags,
        [tagId]: {
            ...allTags[tagId],
            ...changes,
        },
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
