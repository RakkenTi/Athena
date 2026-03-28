import { createSignal, type Accessor } from 'solid-js'
import {
    allMoments,
    dateFilter,
    defaultArchiveId,
    selectedArchiveId,
    selectedTagIds,
    selectedURLFilters,
    type MomentData,
    type MomentId,
} from './data'
import { allTags, type Tag } from './data'

export const generateVibrantColour = () => {
    const hue = Math.floor(Math.random() * 360)
    return `hsl(${hue}, 70%, 60%)`
}

/**
 * Sorts tags by relevance
 *
 * Relevance is defined by which tags are most currently used in the current context.
 *
 * Context is defined as the currently displayed moments.
 */
export const sortTags = (tagsToSort: Array<Tag>) => {
    const currentFilteredMoments = getFilteredMoments()
    const visibleTagIds = currentFilteredMoments.flatMap((m) => m.tagIds)
    const countMap: Record<string, number> = {}

    for (const tagId of visibleTagIds) {
        const tagData = allTags[tagId]
        if (!tagData) continue
        if (!countMap[tagData.name]) {
            countMap[tagData.name] = 1
        } else {
            countMap[tagData.name] += 1
        }
    }

    return [...tagsToSort].sort((a, b) => {
        const aWeight = countMap[a.name]
        const bWeight = countMap[b.name]
        if (aWeight && bWeight) {
            if (aWeight > bWeight) {
                return -1
            } else {
                return 1
            }
        } else if (aWeight) {
            return -1
        } else if (bWeight) {
            return 1
        }
        return 0
    })
}

export let getFilteredMoments: Accessor<Array<MomentData>> = () => {
    const momentsPool = Object.values(allMoments)
    return momentsPool
        .filter((momentData) => {
            // archive
            const currentArchiveId = selectedArchiveId()
            const momentArchiveId = momentData.archiveId

            if (
                currentArchiveId != defaultArchiveId &&
                momentArchiveId != currentArchiveId
            ) {
                return false
            }

            // tags
            const currentSelectedTagsIds = selectedTagIds()
            if (currentSelectedTagsIds.length > 0) {
                for (const selectedTagId of currentSelectedTagsIds) {
                    if (!momentData.tagIds.includes(selectedTagId)) return false
                }
            }

            // timeline
            const dateFilters = dateFilter()
            const startTime = dateFilters.start.getTime()
            const endTime = dateFilters.end.getTime()
            const momentDate = new Date(momentData.timestamp)
            momentDate.setUTCHours(0, 0, 0, 0)

            const momentTime = momentDate.getTime()

            if (!(startTime <= momentTime && momentTime <= endTime)) {
                return false
            }

            // Media
            const targetURLs = selectedURLFilters()
            if (targetURLs.length > 0) {
                const containsURL = targetURLs.some((url) =>
                    momentData.content
                        .toLowerCase()
                        .includes(url.toLowerCase()),
                )
                if (!containsURL) return false
            }

            return true
        })
        .sort(
            (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime(),
        )
}

// Moment Creator
export const [title, setTitle] = createSignal<string>('')
export const [content, setContent] = createSignal<string>('')
export const [tagsString, setTagsString] = createSignal<string>('')

// Editing Moments
export const [editingMoment, setEditingMoment] = createSignal<
    MomentId | undefined
>()

// Deleting Moments
export const [momentToDelete, setMomentToDelete] = createSignal<
    MomentId | undefined
>()

// Modals
export type MODAL_NAMES = 'NONE' | 'EDIT_MODAL' | 'CONFIRM_MOMENT_DELETE'

export const [displayedModal, setDisplayedModal] =
    createSignal<MODAL_NAMES>('NONE')

// Constants
export const iconClasses =
    'opacity-0 group-hover:opacity-100 fa-solid text-highlight-alt-strong hover:text-highlight-alt-strongest hover:scale-125 hover:cursor-pointer transition-all duration-200 '

export const rootMarginPixels = 2000
