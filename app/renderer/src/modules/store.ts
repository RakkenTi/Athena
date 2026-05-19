import { createSignal } from 'solid-js'
import type { ScrapeData } from '../../../main/src/types/APISchema'
import { createStore } from 'solid-js/store'

// Constants
export const BeginningOfTime = new Date()
export const EndOfTime = new Date()
BeginningOfTime.setTime(0)
EndOfTime.setUTCFullYear(9999)

export const defaultArchiveId = '_default_archive_' as ArchiveId
export const defaultArchiveName = '__GENERAL__'

// Types & Interfaces
export type FileName = string
export type FileRefs = Record<string, File>

export type LibraryType = 'local' | 'server'
export interface Library {
    id: string
    name: string
    type: 'local' | 'server'

    url?: string
    token?: string
    role?: 'admin' | 'viewer'

    syncStatus?: 'synced' | 'dirty' | 'syncing' | 'conflict' | 'offline'
    lastSyncTime?: string

    messages: Array<BufferMessage>
}

export type MomentId = `moment_${string}`
export interface MomentData {
    uuid: MomentId
    title: string
    content: string
    archiveId: ArchiveId | undefined
    timestamp: Date
    tagIds: Array<TagId>
    updated_at?: string
    deleted?: boolean
}

export type ArchiveId = `archive_${string}`
export interface Archive {
    uuid: ArchiveId
    name: string
    momentsIds: Array<MomentId>
    updated_at?: string
    timestamp?: string
    deleted?: boolean
}

export type TagId = `tag_${string}`
export type Tags = Record<TagId, Tag>
export interface Tag {
    id: TagId
    name: string
    colour: string
    refCount: number
    updated_at?: string
    timestamp?: string
    deleted?: boolean
}

export interface MediaFilter {
    url: string
    nickname: string
    refCount: number
}
export type url = string
export type baseUrlString = string

export interface LibraryDataSnapshot {
    archives: Record<ArchiveId, Archive>
    moments: Record<MomentId, MomentData>
    tags: Record<TagId, Tag>
    linkPreviewCache?: Record<string, any> // LEGACY, SHOULD NOT BE USED! only to be migrated.
    messages: Array<BufferMessage>
}

export interface BufferMessage {
    id: string
    author_name: string
    content: string
    timestamp: string
    updated_at?: string
    deleted?: boolean
}

export interface DataSnapshot {
    version: string
    libraries: Library[]
    activeLibraryId: string
    libraryData: Record<string, LibraryDataSnapshot>
    linkPreviewCache: Record<string, any>
    moments?: any // LEGACY, SHOULD NOT BE USED! only to be migrated.
}

export type dataSnapshot = DataSnapshot

// Signals & Stores

// Messages
export const [allMessages, setAllMessages] = createStore<BufferMessage[]>([])

// Reference Files
export const [refFiles, setRefFiles] = createSignal<FileRefs>({})
export const [activeUploadCount, setActiveUploadCount] = createSignal<number>(0)

// Libraries
export const [isDownloading, setIsDownloadingServer] = createSignal(false)
export const [switchingLibrary, setSwitchingLibrary] =
    createSignal<boolean>(false)
export const shouldBlurLibraryView = () =>
    !jwtToken() && getActiveLibrary()?.type === 'server'
export const [libraries, setLibraries] = createSignal<Library[]>([])
export const [libraryToDelete, setLibraryToDelete] = createSignal<
    string | null
>(null)
export const [serverDownloadLibName, setServerDownloadLibName] =
    createSignal<string>('')

// Server / Sync
export const [activeLibraryId, _setActiveLibraryId] = createSignal<string>('')
export const getActiveLibrary = () =>
    libraries().find((l) => l.id === activeLibraryId())
export const jwtToken = () => getActiveLibrary()?.token || ''
export const serverRole = () => getActiveLibrary()?.role || null
export const syncStatus = () => getActiveLibrary()?.syncStatus || 'synced'
export const lastSyncTime = () => getActiveLibrary()?.lastSyncTime || 'Never'

// Link Previews
export const [inspectingImageExternalLink, setInspectingImageExternalLink] =
    createSignal<string | undefined>()
export const [inspectingImage, setInspectingImage] = createSignal<
    string | undefined
>()

type LinkMetadata = Record<string, ScrapeData>
type Dimensions = Record<
    string,
    {
        width: number
        height: number
    }
>

export type LinkPreviewCache = {
    metadata: LinkMetadata
    dimensions: Dimensions
}

export const EmptyLinkPreviewCache: LinkPreviewCache = {
    metadata: {} as LinkMetadata,
    dimensions: {} as Dimensions,
}

export const [linkPreviewCache, setLinkPreviewCache] =
    createStore<LinkPreviewCache>(EmptyLinkPreviewCache)

// Moment Creator form fields
export const [title, setTitle] = createSignal<string>('')
export const [content, setContent] = createSignal<string>('')
export const [tagsString, setTagsString] = createSignal<string>('')

// Moments
export const [searchQuery, setSearchQuery] = createSignal<string>('')
export const [allMoments, setAllMoments] = createStore<
    Record<MomentId, MomentData>
>({})

// Archives
export const [archives, setArchives] = createSignal<Record<ArchiveId, Archive>>(
    {},
)
export const [selectedArchiveId, setSelectedArchive] =
    createSignal<ArchiveId>(defaultArchiveId)

// Tags
export const [selectedTagIds, setSelectedTagIds] = createSignal<Array<TagId>>(
    [],
)
export const [allTags, setAllTags] = createStore<Record<TagId, Tag>>({})

// Date filter
export const [dateFilter, setDateFilter] = createSignal<{
    start: Date
    end: Date
}>({ start: BeginningOfTime, end: EndOfTime })

// Editing / deleting moments (used by modal system)
export const [editingMomentId, setEditingMomentId] = createSignal<
    MomentId | undefined
>()
export const [momentToDelete, setMomentToDelete] = createSignal<
    MomentId | undefined
>()

// Media Filters  (baseUrl → MediaFilter)
export const [mediaFilters, setMediaFilters] = createStore<
    Record<baseUrlString, MediaFilter>
>({})
export const [selectedURLFilters, setSelectedURLFilters] = createSignal<
    Array<string>
>([])
