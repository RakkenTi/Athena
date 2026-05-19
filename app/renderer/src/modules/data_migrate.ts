import { getApi } from './ipc_client'
import { generateVibrantColour } from './globals'
import { version } from '../../../../package.json'
import {
    defaultArchiveId,
    defaultArchiveName,
    type Archive,
    type ArchiveId,
    type DataSnapshot,
    type LibraryDataSnapshot,
    type Library,
    type MomentData,
    type MomentId,
    type Tag,
    type TagId,
} from './store'

const DEFAULT_LIBRARY_ID = 'local-default'
const DEFAULT_LIBRARY: Library = {
    id: DEFAULT_LIBRARY_ID,
    name: 'My Library',
    type: 'local',
    messages: [],
}

export const emptySnapshot: DataSnapshot = {
    version: '',
    libraries: [],
    activeLibraryId: '',
    libraryData: {},
    linkPreviewCache: {},
}

interface LegacyMomentData {
    title: string
    content: string
    timestamp: string | Date
    tags: Array<string>
    archive?: string
}

const migrateSingleLibraryToMulti = (rawData: any): DataSnapshot => {
    const api = getApi()!

    const libSnapshot: LibraryDataSnapshot = {
        archives: rawData.archives || {},
        moments: rawData.moments || {},
        tags: rawData.tags || {},
        messages: [],
    }

    if (!(libSnapshot.archives as any)[defaultArchiveId]) {
        ;(libSnapshot.archives as any)[defaultArchiveId] = {
            uuid: defaultArchiveId,
            name: defaultArchiveName,
            momentsIds: [],
        }
    }

    const snapshot: DataSnapshot = {
        version,
        libraries: [DEFAULT_LIBRARY],
        activeLibraryId: DEFAULT_LIBRARY_ID,
        libraryData: { [DEFAULT_LIBRARY_ID]: libSnapshot },
        linkPreviewCache: rawData.linkPreviewCache || {},
    }

    api.writeMainData(snapshot)
    return snapshot
}

const migrateFirstLegacy = (rawData: any): DataSnapshot => {
    const api = getApi()!

    const oldMoments = (rawData.moments || []) as Array<LegacyMomentData>
    const oldTags = (rawData.tags || []) as Array<string>
    const oldTagColours = (rawData.tagColours || {}) as Record<string, string>
    const oldArchives = (rawData.archives || []) as Array<string>

    const newTags: Record<TagId, Tag> = {}
    const newArchives: Record<ArchiveId, Archive> = {}
    const newMoments: Record<MomentId, MomentData> = {}

    const tagNameToId = new Map<string, TagId>()
    const archiveNameToId = new Map<string, ArchiveId>()

    archiveNameToId.set(defaultArchiveName, defaultArchiveId)
    newArchives[defaultArchiveId] = {
        uuid: defaultArchiveId,
        name: defaultArchiveName,
        momentsIds: [],
    }

    for (const archName of oldArchives) {
        if (archName === defaultArchiveName) continue
        const id: ArchiveId = `archive_${window.crypto.randomUUID()}`
        archiveNameToId.set(archName, id)
        newArchives[id] = { uuid: id, name: archName, momentsIds: [] }
    }

    for (const tagName of oldTags) {
        const id: TagId = `tag_${window.crypto.randomUUID()}`
        tagNameToId.set(tagName, id)
        newTags[id] = {
            id,
            name: tagName,
            colour: oldTagColours[tagName] || generateVibrantColour(),
            refCount: 0,
        }
    }

    for (const oldMom of oldMoments) {
        const momentId: MomentId = `moment_${window.crypto.randomUUID()}`
        const mappedTagIds: Array<TagId> = []

        for (const tName of oldMom.tags || []) {
            const tId = tagNameToId.get(tName)
            if (tId && newTags[tId]) {
                mappedTagIds.push(tId)
                newTags[tId].refCount += 1
            }
        }

        const mArchiveName = oldMom.archive || defaultArchiveName
        const mappedArchiveId =
            archiveNameToId.get(mArchiveName) || defaultArchiveId

        if (newArchives[mappedArchiveId]) {
            newArchives[mappedArchiveId].momentsIds.push(momentId)
        }

        newMoments[momentId] = {
            uuid: momentId,
            title: oldMom.title || '',
            content: oldMom.content || '',
            archiveId: mappedArchiveId,
            timestamp: new Date(oldMom.timestamp || new Date()),
            tagIds: mappedTagIds,
        }
    }

    // Prune tags that were never referenced
    for (const [tagId, tagData] of Object.entries(newTags)) {
        if (tagData.refCount <= 0) delete newTags[tagId as TagId]
    }

    const snapshot: DataSnapshot = {
        version,
        libraries: [DEFAULT_LIBRARY],
        activeLibraryId: DEFAULT_LIBRARY_ID,
        libraryData: {
            [DEFAULT_LIBRARY_ID]: {
                archives: newArchives,
                moments: newMoments,
                tags: newTags,
                messages: [],
            },
        },
        linkPreviewCache: {}, // Ancient formats get an empty cache
    }

    api.writeMainData(snapshot)
    return snapshot
}

export const migrateOldData = async (): Promise<DataSnapshot | null> => {
    const api = getApi()
    if (!api) return null

    const rawData = await api.readData()
    if (!rawData?.libraries) {
        return emptySnapshot
    }

    if (rawData.libraryData !== undefined) {
        let needsCacheMigration = false
        let combinedCache = rawData.linkPreviewCache || {}

        for (const libId in rawData.libraryData) {
            if (rawData.libraryData[libId].linkPreviewCache) {
                needsCacheMigration = true
                combinedCache = {
                    ...combinedCache,
                    ...rawData.libraryData[libId].linkPreviewCache,
                }
                delete rawData.libraryData[libId].linkPreviewCache
            }
        }

        if (needsCacheMigration || !rawData.linkPreviewCache) {
            console.log('Migrating per-library link cache to global cache...')
            rawData.linkPreviewCache = combinedCache
            api.writeMainData(rawData)
            return rawData as DataSnapshot
        }

        return null
    }

    if (rawData.version && !Array.isArray(rawData.moments)) {
        console.log('Migrating single-library data to multi-library format…')
        console.log(
            'Note: It is recommended to start fresh for stability. Data migration may be partially wrong.',
        )
        return migrateSingleLibraryToMulti(rawData)
    }

    console.log('Migrating ancient data format to multi-library format…')
    console.log(
        'Note: It is recommended to start fresh for stability. Data migration may be partially wrong.',
    )
    return migrateFirstLegacy(rawData)
}
