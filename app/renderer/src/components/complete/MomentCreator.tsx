import { createMemo, For, Show, type Component } from 'solid-js'
import { Line } from '../barebone/Line'
import {
    archives,
    content,
    createMoment,
    registerTags,
    selectedArchive,
    setContent,
    setTagsString,
    setTitle,
    tags,
    tagsString,
    title,
    type ArchiveId,
    type Tag,
} from '../../modules/data'
import { sortTags } from '../../modules/utils'

export const MomentCreator: Component = () => {
    const getSuggestableTags = createMemo(() => {
        // retrieve
        const allTags = tags()
        const currentTypedTags = tagsString()
            .split(',')
            .map((tag) => tag.toUpperCase().trim())
        const currentTypedTag = currentTypedTags[currentTypedTags.length - 1]

        const suggestedTags: Array<Tag> = []
        for (const [_, tagData] of Object.entries(allTags)) {
            if (
                tagData.name.startsWith(currentTypedTag) &&
                !currentTypedTags.includes(tagData.name)
            ) {
                suggestedTags.push(tagData)
            }
        }

        return sortTags(suggestedTags)
    })

    const attemptSubmit = () => {
        if (!title() || !content()) return

        // Update tags
        const tagNameArray: Array<string> = [
            ...new Set(
                tagsString()
                    .toUpperCase()
                    .split(',')
                    .map((tag) => tag.trim())
                    .filter((tag) => tag.length > 0),
            ),
        ]

        // Create Moment
        const date = new Date()

        createMoment({
            title: title(),
            content: content(),
            archiveId: selectedArchive(),
            timestamp: date,
            tagIds: registerTags(tagNameArray),
        })
        setTitle('')
        setContent('')
        setTagsString('')
    }

    return (
        <div class="bg-element-lighter border-element-accent flex w-full flex-col gap-3 rounded-xl border p-4">
            <input
                class="bg-transparent px-2 py-1 text-lg font-bold text-slate-100 placeholder-slate-600 outline-none"
                placeholder="Moment Title..."
                value={title()}
                onInput={(e) => setTitle(e.currentTarget.value)}
            />
            <textarea
                class="field-sizing-content h-auto max-h-96 min-h-12 bg-transparent px-2 py-1 text-sm text-slate-300 placeholder-slate-600 outline-none placeholder:italic"
                placeholder="Moment description..."
                value={content()}
                onInput={(e) => setContent(e.currentTarget.value)}
            />
            <div class="mx-2 flex w-full flex-col items-center gap-6">
                <input
                    class="w-full rounded border border-transparent bg-slate-950/50 px-2 py-1.5 font-mono text-xs text-cyan-400 placeholder-slate-600 outline-none focus:border-cyan-800"
                    placeholder="Tags (comma separated)... e.g. GAMES, ENTERTAINMENT, ROMANCE"
                    value={tagsString()}
                    onInput={(e) => setTagsString(e.currentTarget.value)}
                    onKeyDown={(e) => {
                        if (e.key == 'Enter') {
                            attemptSubmit()
                        }
                    }}
                />

                <Show
                    when={
                        getSuggestableTags().length > 0 &&
                        (title() != '' || content() != '' || tagsString() != '')
                    }
                >
                    <div class="flex w-full flex-wrap items-center gap-2 rounded-lg text-sm font-bold tracking-widest">
                        <span class="font-black">Suggested:</span>
                        <For each={getSuggestableTags()}>
                            {(tagData) => (
                                <span
                                    onClick={() => {
                                        setTagsString((prev) => {
                                            const tagArray = prev.split(',')
                                            const length = tagArray.length
                                            tagArray[length - 1] = tagData.name
                                            return tagArray.join(',')
                                        })
                                    }}
                                    style={`background-color: ${tagData.colour}`}
                                    class="text-dark rounded-lg px-2 py-1.5 text-xs font-black transition-all duration-100 hover:scale-105 hover:cursor-pointer active:scale-95"
                                >
                                    #{tagData.name}
                                </span>
                            )}
                        </For>
                    </div>
                </Show>

                <Line class="bg-element-accent h-0.5 w-full" />
                <div class="flex w-full flex-wrap items-center justify-between text-sm">
                    <div class="text-element-accent-highlight flex items-center gap-2 px-2 font-mono tracking-widest">
                        <span>DESTINATION:</span>
                        <span class="rounded bg-slate-800 px-2 py-1 text-cyan-400">
                            {archives()[selectedArchive() || ('' as ArchiveId)]
                                ?.name || ''}
                        </span>
                    </div>
                    <button
                        onClick={attemptSubmit}
                        class="hover:bg-highlight-strong hg hover:shadow-highlight-strong bg-highlight hover:border-highlight-strong rounded px-4 py-2 text-xs font-bold tracking-widest transition-all duration-200 hover:scale-105 hover:cursor-pointer hover:shadow-md hover:duration-50 active:scale-95"
                    >
                        COMMIT
                    </button>
                </div>
            </div>
        </div>
    )
}
