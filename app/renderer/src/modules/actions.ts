import { batch } from 'solid-js'
import { reconcile, unwrap } from 'solid-js/store'
import { getApi } from './ipc_client'
import {
    archives,
    setArchives,
    allMoments,
    setAllMoments,
    allTags,
    setAllTags,
    setSelectedTagIds,
    mediaFilters,
    setMediaFilters,
    selectedArchiveId,
    setSelectedArchive,
    content,
    setContent,
    setRefFiles,
    defaultArchiveId,
    defaultArchiveName,
    type Archive,
    type ArchiveId,
    type MomentData,
    type MomentId,
    type Tag,
    type TagId,
    activeLibraryId,
    libraries,
    jwtToken,
    setLibraries,
    setActiveUploadCount,
    getActiveLibrary,
    setInspectingImage,
    setLinkPreviewCache,
    EmptyLinkPreviewCache,
} from './store'
import {
    extractBaseURL,
    extractContentParts,
    extractContentParts as extractContentPartsFromContent,
    generateVibrantColour,
    iterateUrlsInContentParts,
    registerMediaFilter,
    setAppSettings,
    setDisplayedModal,
} from './globals'
import { updateActiveLibrary } from './libraries'
import type { AppSettings } from './settings'

// Action Queue
export type ActionType = 'CREATE' | 'UPDATE' | 'DELETE'
export type ActionTarget = 'ARCHIVE' | 'MOMENT' | 'TAG' | 'BUFFER_MESSAGE'

export const uploadAttachment = async (
    targetUrl: string,
    token: string,
    fileObj: File | Blob,
): Promise<string> => {
    const formData = new FormData()
    formData.append('file', fileObj)

    const res = await fetch(`${targetUrl}/api/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
    })

    if (!res.ok) throw new Error('Failed to upload file')

    const data = await res.json()
    return data.url
}

export interface ServerAction {
    type: ActionType
    target: ActionTarget
    target_id: string
    body: any
}

let actionQueue: ServerAction[] = []
let syncTimeout: ReturnType<typeof setTimeout> | null = null

export const flushActionQueue = async () => {
    if (actionQueue.length === 0) return
    console.log('Flushing action queue...')

    const activeLib = getActiveLibrary()
    if (activeLib?.type !== 'server') return

    const token = jwtToken()
    if (!token) {
        console.log('no token, halting queue')
        setDisplayedModal('SERVER_LOGIN_MODAL')
        return
    }

    const targetUrl = activeLib.url || 'http://localhost:8080'

    const payload = [...actionQueue]
    actionQueue = []

    for (const action of payload) {
        if (action.target === 'MOMENT' && action.body?.content) {
            const parts = extractContentParts(action.body.content)

            let updatedContent = action.body.content

            for (const part of parts) {
                if (
                    part.body.startsWith('blob:') ||
                    part.body.startsWith('file://') ||
                    part.body.startsWith('athena://')
                ) {
                    console.log(`Uploading local attachment: ${part}`)

                    try {
                        const fileRes = await fetch(part.body)
                        const rawBlob = await fileRes.blob()

                        const newServerUrl = await uploadAttachment(
                            targetUrl,
                            token,
                            rawBlob,
                        )

                        const fullServerUrl = `${targetUrl}${newServerUrl}`

                        updatedContent = updatedContent
                            .split(part)
                            .join(fullServerUrl)
                    } catch (err) {
                        console.error(
                            'Failed to upload attachment, skipping sync for this moment.',
                            err,
                        )
                        actionQueue = [...payload, ...actionQueue]
                        return
                    }
                }
            }

            action.body.content = updatedContent
        }
    }

    try {
        const res = await fetch(`${activeLib.url}/api/library`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ actions: payload }),
        })

        if (res.status === 401 || res.status === 403) {
            console.warn('Token expired while saving! Halting queue.')

            actionQueue = [...payload, ...actionQueue]

            updateActiveLibrary({
                token: '',
                syncStatus: 'conflict',
            })

            setDisplayedModal('SERVER_LOGIN_MODAL')

            return
        }

        if (!res.ok) throw new Error('Failed to push actions')
    } catch (err) {
        console.error('Failed to flush actions', err)

        actionQueue = [...payload, ...actionQueue]

        updateActiveLibrary({ syncStatus: 'offline' })
    }
}

export const queueAction = (action: ServerAction) => {
    const activeId = activeLibraryId()
    const activeLib = libraries().find((l) => l.id === activeId)

    // Only queue actions if currently looking at an online library
    if (activeLib?.type !== 'server') return

    actionQueue.push(action)

    if (syncTimeout) clearTimeout(syncTimeout)

    // Debounce the sync so rapidly typing or rapid state changes get batched into one HTTP request
    syncTimeout = setTimeout(async () => {
        if (actionQueue.length === 0) return
        await flushActionQueue()
    }, 750)
}

// Libraries
export const editLibraryName = (id: string, newName: string) => {
    setLibraries((prevLibs) =>
        prevLibs.map((lib) =>
            lib.id === id ? { ...lib, name: newName } : lib,
        ),
    )
}

// Archives
export const createArchive = (archiveName: string): Archive => {
    const allArchives = { ...archives() }
    for (const archiveData of Object.values(allArchives)) {
        if (archiveData.name === archiveName) return archiveData
    }
    const newArchiveId: ArchiveId = `archive_${window.crypto.randomUUID()}`
    const now = new Date().toISOString()

    const newArchive: Archive = {
        name: archiveName,
        uuid: newArchiveId,
        momentsIds: [],
        updated_at: now,
        timestamp: now,
    }
    allArchives[newArchiveId] = newArchive
    setArchives(allArchives)

    // Queue to Server
    queueAction({
        type: 'CREATE',
        target: 'ARCHIVE',
        target_id: newArchiveId,
        body: newArchive,
    })

    return newArchive
}

export const updateArchive = (
    archiveId: ArchiveId,
    changes: Partial<Omit<Archive, 'uuid'>>,
) => {
    const prev = archives()[archiveId]
    if (!prev) return

    const updatedArchive = {
        ...prev,
        ...changes,
        updated_at: new Date().toISOString(),
    }

    setArchives((all) => ({
        ...all,
        [archiveId]: updatedArchive,
    }))

    // Queue to Server (Backend Upsert expects the full object)
    queueAction({
        type: 'UPDATE',
        target: 'ARCHIVE',
        target_id: archiveId,
        body: updatedArchive,
    })
}

export const deleteArchive = (archiveId: ArchiveId) => {
    batch(() => {
        if (selectedArchiveId() === archiveId) {
            setSelectedArchive(defaultArchiveId)
        }

        const allArchives = { ...archives() }
        const archiveData = allArchives[archiveId]
        if (!archiveData) return

        const momentIds = archiveData.momentsIds

        // Reassign moments to default archive
        for (const momentId of momentIds) {
            const oldMoment = allMoments[momentId]
            const updatedMoment = {
                ...oldMoment,
                archiveId: defaultArchiveId,
                updated_at: new Date().toISOString(),
            }
            setAllMoments(momentId, updatedMoment)

            // Queue Moment Updates so the Server knows they moved!
            queueAction({
                type: 'UPDATE',
                target: 'MOMENT',
                target_id: momentId,
                body: updatedMoment,
            })
        }

        const defaultArch = allArchives[defaultArchiveId]
        if (defaultArch) {
            allArchives[defaultArchiveId] = {
                ...defaultArch,
                updated_at: new Date().toISOString(),
                momentsIds: [...defaultArch.momentsIds, ...momentIds],
            }
            queueAction({
                type: 'UPDATE',
                target: 'ARCHIVE',
                target_id: defaultArchiveId,
                body: allArchives[defaultArchiveId],
            })
        }

        delete allArchives[archiveId]
        setArchives(allArchives)

        // Tell Server to delete the Archive
        queueAction({
            type: 'DELETE',
            target: 'ARCHIVE',
            target_id: archiveId,
            body: {},
        })
    })
}

// MOMENTS
export const InspectImage = (url: string) => {
    setInspectingImage(url)
    setDisplayedModal('IMAGE_INSPECT_MODAL')
}

export const createMoment = (
    data: Omit<MomentData, 'uuid' | 'timestamp' | 'updated_at'> & {
        timestamp?: Date
    },
): boolean => {
    const newMomentId: MomentId = `moment_${window.crypto.randomUUID()}`
    const targetArchiveId = data.archiveId ?? defaultArchiveId
    const now = new Date()

    const newMoment: MomentData = {
        ...data,
        uuid: newMomentId,
        timestamp: data.timestamp || now,
        updated_at: now.toISOString(),
    }

    batch(() => {
        data.tagIds.forEach((id) => {
            if (allTags[id]) setAllTags(id, 'refCount', (v) => v + 1)
        })

        setAllMoments(newMomentId, newMoment)

        setArchives((prev) => {
            const targetArchiveData = prev[targetArchiveId]
            if (!targetArchiveData) return prev
            return {
                ...prev,
                [targetArchiveId]: {
                    ...targetArchiveData,
                    updated_at: new Date().toISOString(),
                    momentsIds: [
                        ...(targetArchiveData.momentsIds ?? []),
                        newMomentId,
                    ],
                },
            }
        })
    })

    // Queue to Server
    queueAction({
        type: 'CREATE',
        target: 'MOMENT',
        target_id: newMomentId,
        body: newMoment,
    })

    return true
}

export const swapMomentArchive = (
    momentId: MomentId,
    newArchiveName: string,
) => {
    if (newArchiveName.trim() === '') newArchiveName = defaultArchiveName

    const momentData = allMoments[momentId]
    if (!momentData) {
        console.error('swapMomentArchive: moment not found.', momentId)
        return
    }

    const newArchiveData = createArchive(newArchiveName)
    const oldArchiveId = momentData.archiveId

    if (!oldArchiveId || !newArchiveData) {
        console.error('swapMomentArchive: insufficient data.')
        return
    }

    console.log(
        `Moving moment ${momentId}: ${oldArchiveId} → ${newArchiveData.uuid}`,
    )

    batch(() => {
        const currentArchives = archives()

        const oldArch = currentArchives[oldArchiveId]
        if (oldArch) {
            updateArchive(oldArchiveId, {
                momentsIds: oldArch.momentsIds.filter((id) => id !== momentId),
            })
        }

        const newArch = currentArchives[newArchiveData.uuid]
        if (newArch) {
            updateArchive(newArchiveData.uuid, {
                momentsIds: [...newArch.momentsIds, momentId],
            })
        }

        const updatedMoment = {
            ...momentData,
            archiveId: newArchiveData.uuid,
            updated_at: new Date().toISOString(),
        }
        setAllMoments(momentId, updatedMoment)

        // Queue Moment Update to Server
        queueAction({
            type: 'UPDATE',
            target: 'MOMENT',
            target_id: momentId,
            body: updatedMoment,
        })
    })
}

export const updateMoment = (
    momentId: MomentId,
    changes: Partial<Omit<MomentData, 'uuid'>>,
): boolean | undefined => {
    const oldMoment = allMoments[momentId]
    if (!oldMoment) return

    const finalChanges = {
        ...changes,
        updated_at: new Date().toISOString(),
    }

    const newTagIds = changes.tagIds

    if (newTagIds) {
        const oldIds = oldMoment.tagIds

        subtractMediaFiltersFromContent(oldMoment.content)
        if (changes.content) {
            const contentParts = extractContentPartsFromContent(changes.content)
            iterateUrlsInContentParts(contentParts, (url) => {
                const baseUrl = extractBaseURL(url)
                if (baseUrl) registerMediaFilter(baseUrl)
            })
        }

        const removed = oldIds.filter((id) => !newTagIds.includes(id))
        const added = newTagIds.filter((id) => !oldIds.includes(id))

        removed.forEach((id) => {
            if (!allTags[id]) return
            const newCount = allTags[id].refCount - 1
            if (newCount <= 0) {
                setAllTags(id, undefined!)
                setSelectedTagIds((prev) => prev.filter((tid) => tid !== id))
                // Tell Server the Tag is dead
                queueAction({
                    type: 'DELETE',
                    target: 'TAG',
                    target_id: id,
                    body: {},
                })
            } else {
                setAllTags(id, 'refCount', newCount)
            }
        })

        added.forEach((id) => {
            if (allTags[id]) setAllTags(id, 'refCount', (v) => v + 1)
        })
    }

    const updatedMoment = { ...oldMoment, ...finalChanges }
    setAllMoments(momentId, updatedMoment)

    // Queue to Server
    queueAction({
        type: 'UPDATE',
        target: 'MOMENT',
        target_id: momentId,
        body: updatedMoment,
    })

    return true
}

export const deleteMoment = (uuid: MomentId): boolean | undefined => {
    const momentToDelete = allMoments[uuid]
    if (!momentToDelete) {
        console.warn('deleteMoment: moment does not exist.', uuid)
        return
    }

    console.log(`Deleting moment: ${uuid}`)
    const archiveId = momentToDelete.archiveId
    const now = new Date().toISOString()

    setAllMoments(uuid, {
        deleted: true,
        updated_at: now,
    })

    const currentArchives = archives()
    if (archiveId && currentArchives[archiveId]) {
        updateArchive(archiveId, {
            momentsIds: currentArchives[archiveId].momentsIds.filter(
                (id) => id !== uuid,
            ),
        })
    }

    for (const id of momentToDelete.tagIds) {
        if (!allTags[id]) continue
        const newCount = allTags[id].refCount - 1

        if (newCount <= 0) {
            console.log('Tombstoning orphaned tag:', allTags[id].name)
            setAllTags(id, {
                refCount: 0,
                deleted: true,
                updated_at: now,
            })
            // Tell Server to delete orphaned Tag
            queueAction({
                type: 'DELETE',
                target: 'TAG',
                target_id: id,
                body: {},
            })
        } else {
            setAllTags(id, {
                refCount: newCount,
                updated_at: now,
            })
        }
    }

    subtractMediaFiltersFromContent(momentToDelete.content)

    queueAction({ type: 'DELETE', target: 'MOMENT', target_id: uuid, body: {} })

    return true
}

// Tags
export const registerTags = (newTags: Array<string>): Array<TagId> => {
    const transformedNames = [
        ...new Set(
            newTags
                .map((t) => t.toUpperCase().trim())
                .filter((t) => t.length > 0),
        ),
    ]

    const resultIds: Array<TagId> = []

    batch(() => {
        const nameIdMap = new Map(
            Object.values(unwrap(allTags)).map((t) => [t.name, t.id]),
        )

        transformedNames.forEach((name) => {
            const existingId = nameIdMap.get(name)
            if (existingId) {
                resultIds.push(existingId)
                return
            }
            const newTagId: TagId = `tag_${window.crypto.randomUUID()}`
            const now = new Date().toISOString()
            const tagData: Tag = {
                name,
                id: newTagId,
                colour: generateVibrantColour(),
                refCount: 0,
                updated_at: now,
                timestamp: now,
            }
            resultIds.push(newTagId)
            setAllTags(newTagId, tagData)

            // Queue to Server
            queueAction({
                type: 'CREATE',
                target: 'TAG',
                target_id: newTagId,
                body: tagData,
            })
        })
    })

    return resultIds
}

export const updateTag = (
    tagId: TagId,
    changes: Partial<Omit<Tag, 'id'>>,
): boolean | undefined => {
    const prev = allTags[tagId]
    if (!prev) {
        console.warn('updateTag: tag does not exist.', tagId)
        return
    }

    const updatedTag = {
        ...prev,
        ...changes,
        updated_at: new Date().toISOString(),
    }
    setAllTags(tagId, updatedTag)

    // Queue to Server
    queueAction({
        type: 'UPDATE',
        target: 'TAG',
        target_id: tagId,
        body: updatedTag,
    })
    return true
}

export const renameTag = (tagId: TagId, newName: string): boolean | undefined =>
    updateTag(tagId, { name: newName })

export const recolourTag = (
    tagId: TagId,
    newColour: string,
): boolean | undefined => updateTag(tagId, { colour: newColour })

export const saveFileReference = async (
    file: File,
    selection: { Start?: number; End?: number },
    stateOverrides?: {
        getContent: () => string
        setContent: (updater: (prev: string) => string) => void
        setActiveUploadCount: (updater: (prev: number) => number) => void
    },
) => {
    // Determine which state to mutate
    const getStr = stateOverrides ? stateOverrides.getContent : content
    const setStr = stateOverrides ? stateOverrides.setContent : setContent
    const setUploads = stateOverrides
        ? stateOverrides.setActiveUploadCount
        : setActiveUploadCount

    const startPos = selection.Start ?? getStr().length
    const endPos = selection.End ?? getStr().length

    const activeLib = libraries().find((l) => l.id === activeLibraryId())
    const token = jwtToken()

    let maxUploadBytes = 500 * 1024 * 1024

    if (activeLib?.type === 'server' && activeLib.url) {
        try {
            const res = await fetch(`${activeLib.url}/api/version`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            })
            if (res.ok) {
                const data = await res.json()
                if (data.maxUploadBytes) {
                    maxUploadBytes = data.maxUploadBytes
                }
            }
        } catch (e) {
            console.warn(
                'Could not fetch server config. Using default 500MB limit.',
            )
        }
    }

    const isTooLargeForServer = file.size > maxUploadBytes
    if (isTooLargeForServer) {
        const maxMB = Math.round(maxUploadBytes / (1024 * 1024))
        console.warn(
            `File ${file.name} exceeds the ${maxMB}MB limit. Skipping server upload and saving locally.`,
        )
    }

    const currentDate = new Date().getTime()
    const fileName = `attachment_${file.name || currentDate}`
    const placeholder = `[Attaching ${fileName}...]`

    setUploads((prev) => prev + 1)
    setStr(
        (prev) =>
            prev.substring(0, startPos) + placeholder + prev.substring(endPos),
    )

    try {
        const rawData = await file.arrayBuffer()
        let finalUri: string | null = null

        if (
            activeLib?.type === 'server' &&
            activeLib.url &&
            token &&
            !isTooLargeForServer
        ) {
            try {
                const serverPath = await uploadAttachment(
                    activeLib.url,
                    token,
                    file,
                )
                finalUri = `${activeLib.url}${serverPath}`
                console.log('Successfully uploaded file instantly on drop.')
            } catch (serverErr) {
                console.warn(
                    'Instant upload failed, falling back to local storage.',
                    serverErr,
                )
            }
        }

        if (!finalUri) {
            const localUri = await getApi().saveFileRef(rawData, fileName)
            if (localUri) {
                finalUri = localUri
                setRefFiles((prev) => ({ ...prev, [localUri]: file }))
            }
        }

        if (finalUri) {
            setStr((prev) => prev.replace(placeholder, `${finalUri} `))
        } else {
            throw new Error('Both Cloud and Local saving failed.')
        }
    } catch (error) {
        console.error('Failed to attach file:', error)
        setStr((prev) =>
            prev.replace(placeholder, `[ERROR! Failed to attach ${fileName}]`),
        )
        return null
    } finally {
        setUploads((prev) => prev - 1)
    }
}

// Helpers
const subtractMediaFiltersFromContent = (contentStr: string) => {
    const contentParts = extractContentPartsFromContent(contentStr)
    iterateUrlsInContentParts(contentParts, (url) => {
        const baseUrl = extractBaseURL(url)
        if (!baseUrl || !mediaFilters[baseUrl]) return
        const newValue = mediaFilters[baseUrl].refCount - 1
        console.log('Media filter ref removed:', baseUrl, '→', newValue)
        if (newValue <= 0) {
            setMediaFilters(baseUrl, undefined!)
        } else {
            setMediaFilters(baseUrl, 'refCount', newValue)
        }
    })
}

// Settings
export const updateSetting = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K],
) => {
    setAppSettings((prev) => {
        const next = { ...prev, [key]: value }
        getApi().writeSettings(next)
        return next
    })
}

export const ClearWebsiteCache = () => {
    setLinkPreviewCache(reconcile(EmptyLinkPreviewCache))
}

export const regenerateAllColours = () => {
    console.log('Generating new colors!')
    for (const tag of Object.values(allTags)) {
        setAllTags(tag.id, {
            colour: generateVibrantColour(),
        })
    }
}
