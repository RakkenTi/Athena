import { batch, createMemo, For, Show, type Component } from 'solid-js'
import { ClearFilterButton } from './ClearFilterButton'
import {
    selectedTags,
    setSelectedTags,
    setTagColours,
    setTags,
    tagColours,
    tags,
} from '../../modules/data'
import { getFilteredMoments } from './Feed'

const generateVibrantColour = () => {
    const hue = Math.floor(Math.random() * 360)
    return `hsl(${hue}, 70%, 60%)`
}

export const pushMergeTags = (newTags: Array<string>) => {
    const transformed = newTags.map((tag) => tag.toUpperCase())
    batch(() => {
        setTagColours((prev) => {
            const newColours = { ...prev }
            transformed.forEach((tag) => {
                if (!newColours[tag]) {
                    newColours[tag] = generateVibrantColour()
                }
            })

            return newColours
        })
        setTags((prev) => [...new Set([...prev, ...transformed])])
    })
}

/**
 * Sorts tags by relevance
 *
 * Relevance is defined by which tags are most currently used in the current context.
 *
 * Context is defined as the currently displayed moments.
 */
export const sortTags = (tags: Array<string>) => {
    const currentFilteredMoments = getFilteredMoments()
    const visibleTags = currentFilteredMoments.flatMap((m) => m.tags)
    const countMap: Record<string, number> = {}

    for (const tag of visibleTags) {
        if (!countMap[tag]) {
            countMap[tag] = 1
        } else {
            countMap[tag] += 1
        }
    }

    return [...tags].sort((a, b) => {
        const aWeight = countMap[a]
        const bWeight = countMap[b]
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

export const TagBar: Component = () => {
    const availableTags = createMemo(() => {
        tags()
        const currentSelected = selectedTags()

        const remainingMoments = getFilteredMoments().filter((moment) =>
            currentSelected.every((tag) => moment.tags.includes(tag)),
        )

        const remainingTags = new Set<string>()
        remainingMoments.forEach((moment) =>
            moment.tags.forEach((tag) => remainingTags.add(tag)),
        )

        const result = sortTags(Array.from(remainingTags))

        return result
    })

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) => {
            if (prev.includes(tag)) {
                return prev.filter((current_tag) => current_tag != tag)
            }
            return [...prev, tag]
        })
    }

    return (
        <div class="bg-element z-10 flex w-full flex-wrap items-center justify-center gap-2 p-2 backdrop-blur-md transition-all lg:p-6">
            <span class="text-sub text-xs font-black tracking-widest uppercase">
                Selected Tags:
            </span>
            <For each={availableTags()}>
                {(tag) => {
                    return (
                        <button
                            onClick={() => toggleTag(tag)}
                            class={`text-element rounded-xl p-2 text-xs font-black tracking-wide uppercase transition-all duration-100 hover:cursor-pointer ${
                                selectedTags().includes(tag)
                                    ? 'shadow-highlight-strongest border-2 border-white shadow-sm'
                                    : `over:scale-105 hover:text-white`
                            }`}
                            style={`background-color: ${tagColours()[tag]}`}
                        >
                            #{tag}
                        </button>
                    )
                }}
            </For>
            <Show when={selectedTags().length > 0}>
                <ClearFilterButton onClick={() => setSelectedTags([])} />
            </Show>
        </div>
    )
}
