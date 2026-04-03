import { getApi } from './ipc_client'
import { generateVibrantColour } from './globals'
import { version } from '../../../../package.json'
import {
    defaultArchiveId,
    defaultArchiveName,
    type Archive,
    type ArchiveId,
    type DataSnapshot,
    type MomentData,
    type MomentId,
    type Tag,
    type TagId,
} from './data'

interface LegacyMomentData {
    title: string
    content: string
    timestamp: string | Date
    tags: Array<string>
    archive?: string
}

export const migrateOldData = async (): Promise<DataSnapshot | null> => {
    const api = getApi()
    if (!api) return null

    const rawData = await api.readData()

    if (rawData.version && !Array.isArray(rawData.moments)) {
        console.log('Save file is already up to date.')
        return null
    }

    console.log('Attempting to migrate old data.')
    console.log(
        'Note: It is recommended to start fresh for stability. Data migration may be partially wrong.',
    )

    const oldMoments = (rawData.moments || []) as Array<LegacyMomentData>
    const oldTags = (rawData.tags || []) as Array<string>
    const oldTagColours = (rawData.tagColours || {}) as Record<string, string>
    const oldArchives = (rawData.archives || []) as Array<string>
    const linkPreviewCache = rawData.linkPreviewCache || {}

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
        newArchives[id] = {
            uuid: id,
            name: archName,
            momentsIds: [],
        }
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
        const mTags = oldMom.tags || []

        for (const tName of mTags) {
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

    for (const [tagId, tagData] of Object.entries(newTags)) {
        if (tagData.refCount <= 0) {
            delete newTags[tagId as TagId]
        }
    }

    const migratedSnapshot: DataSnapshot = {
        version,
        archives: newArchives,
        moments: newMoments,
        tags: newTags,
        linkPreviewCache,
    }

    api.writeMainData(migratedSnapshot)

    return migratedSnapshot
}
