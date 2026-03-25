import { createMemo, For, Show, type Component } from 'solid-js'
import { Line } from '../barebone/Line'
import { Moment } from './Moment'
import { pushMergeTags } from './TagBar'
import {
    allMoments,
    content,
    dateFilter,
    defaultArchive,
    selectedArchive,
    selectedTags,
    selectedUrlFilters,
    setAllMoments,
    setContent,
    setTagsString,
    setTitle,
    tagColours,
    tags,
    tagsString,
    title,
} from '../../modules/data'

const MonthCreator: Component = () => {
    const getSuggestableTabs = createMemo(() => {
        const registeredTags = tags()
        const currentTypedTags = tagsString()
            .split(',')
            .map((tag) => tag.toUpperCase().trim())
        const currentTypedTag = currentTypedTags[currentTypedTags.length - 1]

        const result = []
        for (const tag of registeredTags) {
            if (
                tag.startsWith(currentTypedTag) &&
                !currentTypedTags.includes(tag)
            ) {
                result.push(tag)
            }
        }

        return result
    })

    return (
        <div class="bg-element-lighter border-element-accent flex w-full flex-col gap-3 rounded-xl border p-4">
            <input
                class="bg-transparent px-2 py-1 text-lg font-bold text-slate-100 placeholder-slate-600 outline-none"
                placeholder="Moment Title..."
                value={title()}
                onInput={(e) => setTitle(e.currentTarget.value)}
            />
            <textarea
                class="h-12 resize-none bg-transparent px-2 py-1 text-sm text-slate-300 placeholder-slate-600 outline-none placeholder:italic"
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
                />

                <Show
                    when={
                        getSuggestableTabs().length > 0 &&
                        (title() != '' || content() != '' || tagsString() != '')
                    }
                >
                    <div class="flex w-full flex-wrap items-center gap-2 rounded-lg text-sm font-bold tracking-widest">
                        <span class="font-black">Suggested:</span>
                        <For each={getSuggestableTabs()}>
                            {(tag) => (
                                <span
                                    onClick={() => {
                                        setTagsString((prev) => {
                                            const tagArray = prev.split(',')
                                            const length = tagArray.length
                                            tagArray[length - 1] = tag
                                            return tagArray.join(',')
                                        })
                                    }}
                                    style={`background-color: ${tagColours()[tag]}`}
                                    class="text-dark rounded-lg px-2 py-1.5 text-xs font-black transition-all duration-100 hover:scale-105 hover:cursor-pointer active:scale-95"
                                >
                                    #{tag}
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
                            {selectedArchive() || defaultArchive}
                        </span>
                    </div>
                    <button
                        onClick={() => {
                            if (!title() || !content()) return

                            // Update tags
                            const tagsArray: Array<string> = [
                                ...new Set(
                                    tagsString()
                                        .split(',')
                                        .map((tag) => tag.trim())
                                        .filter((tag) => tag.length > 0),
                                ),
                            ]

                            pushMergeTags(tagsArray)

                            // Create Moment
                            const date = new Date()

                            const newMoment: Moment = {
                                title: title(),
                                content: content(),
                                archive: selectedArchive(),
                                timestamp: date,
                                tags: tagsArray,
                            }

                            setTitle('')
                            setContent('')
                            setTagsString('')

                            setAllMoments((prev) => [...prev, newMoment])
                        }}
                        class="hover:bg-highlight-strong hg hover:shadow-highlight-strong bg-highlight hover:border-highlight-strong rounded px-4 py-2 text-xs font-bold tracking-widest transition-all duration-200 hover:scale-105 hover:cursor-pointer hover:shadow-md hover:duration-50 active:scale-95"
                    >
                        COMMIT
                    </button>
                </div>
            </div>
        </div>
    )
}

export const getFilteredMoments = createMemo(() => {
    const momentsPool = allMoments()
    return momentsPool.filter((moment) => {
        // archive
        const currentArchive = selectedArchive()
        const momentArchive = moment.archive

        if (currentArchive && momentArchive != currentArchive) {
            return false
        }

        // tags
        const currentSelectedTags = selectedTags()
        if (currentSelectedTags.length > 0) {
            for (const selectedTag of currentSelectedTags) {
                if (!moment.tags.includes(selectedTag)) return false
            }
        }

        // timeline
        const dateFilters = dateFilter()
        const startTime = dateFilters.start.getTime()
        const endTime = dateFilters.end.getTime()

        const momentDate = new Date(moment.timestamp)
        momentDate.setUTCHours(0, 0, 0, 0)

        const momentTime = momentDate.getTime()

        if (!(startTime <= momentTime && momentTime <= endTime)) {
            return false
        }

        // Media
        const targetUrls = selectedUrlFilters()
        if (targetUrls.length > 0) {
            const containsUrl = targetUrls.some((url) =>
                moment.content.toLowerCase().includes(url.toLowerCase()),
            )
            if (!containsUrl) return false
        }

        return true
    })
})

export const Feed: Component = () => {
    return (
        <div class="bg-element pt flex h-full w-full items-center justify-center gap-2 rounded-xl p-2 lg:p-4">
            <div class="flex h-full w-[90%] flex-col items-center gap-4 overflow-y-auto rounded-xl p-2 pt-4 lg:p-4 lg:pt-8">
                <MonthCreator />
                <For each={getFilteredMoments()}>
                    {(each) => {
                        return <Moment {...each} />
                    }}
                </For>
            </div>
        </div>
    )
}
