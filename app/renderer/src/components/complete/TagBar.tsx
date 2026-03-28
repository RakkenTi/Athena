import { createMemo, For, Show, type Component } from 'solid-js'
import { ClearFilterButton } from './ClearFilterButton'
import {
    selectedTagIds,
    setSelectedTagIds,
    tags,
    type Tag,
    type TagId,
} from '../../modules/data'
import { getFilteredMoments, sortTags } from '../../modules/utils'

export const TagBar: Component = () => {
    const toggleTag = (tagId: TagId) => {
        setSelectedTagIds((prev) => {
            if (prev.includes(tagId)) {
                return prev.filter((current_tag) => current_tag != tagId)
            }
            return [...prev, tagId]
        })
    }

    const availableTags = createMemo(() => {
        tags()
        const currentSelected = selectedTagIds()

        const remainingMoments = getFilteredMoments().filter((moment) =>
            currentSelected.every((tagId) => moment.tagIds.includes(tagId)),
        )

        const remainingTags = new Set<Tag>()
        remainingMoments.forEach((moment) =>
            moment.tagIds.forEach((tagId) => remainingTags.add(tags()[tagId])),
        )

        const result = sortTags(Array.from(remainingTags))

        return result
    })

    return (
        <div class="bg-element z-10 flex w-full flex-wrap items-center justify-center gap-2 p-2 backdrop-blur-md transition-all lg:p-6">
            <span class="text-sub text-xs font-black tracking-widest uppercase">
                Selected Tags:
            </span>
            <For each={availableTags()}>
                {(tagData) => {
                    return (
                        <button
                            onClick={() => toggleTag(tagData.id)}
                            class={`text-element rounded-xl p-2 text-xs font-black tracking-wide uppercase transition-all duration-100 hover:cursor-pointer ${
                                selectedTagIds().includes(tagData.id)
                                    ? 'shadow-highlight-strongest border-2 border-white shadow-sm'
                                    : `over:scale-105 hover:text-white`
                            }`}
                            style={`background-color: ${tagData.colour}`}
                        >
                            #{tagData.name}
                        </button>
                    )
                }}
            </For>
            <Show when={selectedTagIds().length > 0}>
                <ClearFilterButton onClick={() => setSelectedTagIds([])} />
            </Show>
        </div>
    )
}
