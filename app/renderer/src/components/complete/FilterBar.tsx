import { createMemo, For, type Component } from 'solid-js'
import { InputFrame } from '../barebone/InputFrame'
import { Line } from '../barebone/Line'
import { ClearFilterButton } from './ClearFilterButton'
import {
    availableURLFiltersAndNicknames,
    BeginningOfTime,
    dateFilter,
    EndOfTime,
    selectedURLFilters,
    setDateFilter,
    setSelectedURLFilters,
} from '../../modules/data'

export const FilterBar: Component = () => {
    const updateFilter = (
        e: InputEvent & {
            currentTarget: HTMLInputElement
            target: HTMLInputElement
        },
        context: 'start' | 'end',
    ) => {
        const value = e.currentTarget.value
        const [year, month, day] = value.split('-').map(Number)

        const localStart = new Date(year, month - 1, day, 0, 0, 0, 0)
        const localEnd = new Date(year, month - 1, day, 23, 59, 59, 999)

        
        if (context == 'start') {
            setDateFilter((prev) => ({ ...prev, start: localStart }))
        } else {
            setDateFilter((prev) => ({ ...prev, end: localEnd }))
        }
    }

    const resetDates = () => {
        setDateFilter({
            start: BeginningOfTime,
            end: EndOfTime,
        })
    }

    const formatDate = (date: Date) => {
        if (
            date.getTime() == BeginningOfTime.getTime() ||
            date.getTime() == EndOfTime.getTime()
        ) {
            return ''
        } else {
            const year = date.getFullYear()
            const month = `${date.getMonth()}`.padStart(2, '0')
            const day = `${date.getDate()}`.padStart(2, '0')
            return `${year}-${month}-${day}`;
        }
    }

    const toggleMediaFilter = (url: string) => {
        const lowerURL = url.toLowerCase()
        setSelectedURLFilters((prev) => {
            if (prev.includes(lowerURL)) {
                return prev.filter((current_url) => current_url != lowerURL)
            }
            return [...prev, lowerURL]
        })
    }

    const getMediaFilterArray = createMemo(() =>
        Object.entries(availableURLFiltersAndNicknames()),
    )

    return (
        <div class="bg-element flex max-w-md flex-col gap-4 rounded-xl p-4 transition-all duration-100">
            <span class="text-sub text-lg font-bold tracking-widest">
                Filters
            </span>
            <div class="flex justify-between">
                <span class="text-sub text-md font-mono tracking-widest">
                    Timeline
                </span>
                <ClearFilterButton onClick={() => resetDates()} />
            </div>
            <div class="flex flex-col gap-8">
                <div class="flex flex-col gap-2">
                    <span class="text-sub font-bold">Start</span>
                    <InputFrame
                        type="date"
                        label="Date"
                        onInput={(e) => updateFilter(e, 'start')}
                        value={formatDate(dateFilter().start)}
                    />
                </div>
                <div class="flex flex-col gap-2">
                    <span class="text-sub font-bold">End</span>
                    <InputFrame
                        type="date"
                        label="Date"
                        value={formatDate(dateFilter().end)}
                        onInput={(e) => updateFilter(e, 'end')}
                    />
                </div>
            </div>
            <Line class="bg-element-accent h-0.5 w-full"></Line>
            <div class="flex justify-between">
                <span class="text-sub text-md font-mono tracking-widest">
                    Media
                </span>
                <ClearFilterButton onClick={() => setSelectedURLFilters([])} />
            </div>
            <div class="flex flex-col gap-2">
                <For each={getMediaFilterArray()}>
                    {([url, nickname]) => (
                        <div class="group p-1">
                            <span
                                onClick={() => toggleMediaFilter(url)}
                                class={`${selectedURLFilters().includes(url.toLowerCase()) ? 'text-highlight-strongest' : 'text-sub'} group-hover:text-highlight-strongest block font-semibold tracking-tight transition-all duration-200 select-none group-hover:scale-105 group-hover:cursor-pointer hover:font-bold hover:tracking-widest active:scale-100`}
                            >
                                [ {nickname || url || 'hello'} ]
                            </span>
                        </div>
                    )}
                </For>
            </div>
        </div>
    )
}
