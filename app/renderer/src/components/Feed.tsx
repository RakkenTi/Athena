import { createSignal, For, Show, type Component, createEffect } from 'solid-js'
import { Moment } from './Moment'
import { MomentCreator } from './MomentCreator'
import {
    displayedModal,
    displayType,
    getFilteredMoments,
    setDisplayType,
} from '../modules/globals'
import {
    activeLibraryId,
    searchQuery,
    serverRole,
    setSearchQuery,
    shouldBlurLibraryView,
    switchingLibrary,
} from '../modules/store'
import { getCurrentLibrary } from '../modules/libraries'
import { LoadingSpinner } from './LoadingSpinner'

const fullDisplayClasses =
    'flex h-full w-full flex-col items-center gap-4 rounded-xl'

const gridDisplayClasses = 'grid grid-cols-4 gap-2'
export const [isSearching, setIsSearching] = createSignal(false)

export const Feed: Component = () => {
    let searchBarRef: HTMLInputElement | undefined
    createEffect(() => {
        if (isSearching()) {
            if (searchBarRef) {
                searchBarRef.focus()
            }
        } else {
            if (searchBarRef) {
                searchBarRef.blur()
            }
        }
    })

    createEffect(() => {
        console.log('Switch state:', switchingLibrary())
    })

    createEffect(() => {
        activeLibraryId()
        setSearchQuery('')
    })

    return (
        <div class="bg-element pt flex w-full items-center justify-center gap-2 overflow-x-hidden rounded-xl p-2 lg:p-4">
            <div class={'flex h-full w-[90%] flex-col items-center gap-4'}>
                <div class="flex w-full items-center justify-between gap-2">
                    <i
                        onClick={() => {
                            setIsSearching(true)
                        }}
                        hidden={isSearching()}
                        class="fa-solid text-icon fa-magnifying-glass hover:cursor-pointer"
                    ></i>
                    <input
                        ref={searchBarRef}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Escape') {
                                setIsSearching(false)
                            }
                        }}
                        onInput={(e) => setSearchQuery(e.currentTarget.value)}
                        value={searchQuery()}
                        onFocusOut={() => setIsSearching(false)}
                        placeholder="Search Moments"
                        class={`${isSearching() ? 'w-full px-2 py-1' : 'w-0 p-0 opacity-0'} bg-element text-sub/80 border-plain/20 rounded-md border transition-all duration-300 focus:outline-none`}
                    />
                    <span
                        class={`${!isSearching() ? 'w-full opacity-100' : 'w-0 opacity-0'} text-main text-center font-bold transition-opacity duration-300`}
                    >
                        {searchQuery() ? (
                            <>
                                Results for:{' '}
                                <span class="font-bold">{searchQuery()}</span>
                            </>
                        ) : (
                            ''
                        )}
                    </span>
                    <div
                        class="flex items-center"
                        onClick={() => {
                            if (displayType() == 'Full') {
                                setDisplayType('Grid')
                            } else {
                                setDisplayType('Full')
                            }
                        }}
                    >
                        <div class="ml-auto">
                            <Show
                                when={displayType() == 'Full'}
                                fallback={
                                    <span class="material-symbols-outlined hover:cursor-pointer">
                                        grid_view
                                    </span>
                                }
                            >
                                <i class="fa-solid fa-bars text-icon hover:cursor-pointer"></i>
                            </Show>
                        </div>
                    </div>
                </div>
                <Show
                    when={!switchingLibrary()}
                    fallback={
                        <div class="w-full">
                            <LoadingSpinner text="Loading library..." />
                        </div>
                    }
                >
                    <div
                        class={`${shouldBlurLibraryView() ? 'blur-sm' : ''} w-full`}
                    >
                        <MomentCreator
                            hide={
                                displayedModal() == 'EDIT_MODAL' ||
                                (getCurrentLibrary()?.type === 'server'
                                    ? serverRole() != 'admin'
                                    : false) ||
                                shouldBlurLibraryView()
                            }
                        />
                    </div>
                    <div
                        class={`${displayType() == 'Full' ? fullDisplayClasses : gridDisplayClasses}`}
                    >
                        <For each={getFilteredMoments()}>
                            {(momentData) => {
                                return (
                                    <div
                                        class={`${shouldBlurLibraryView() ? 'blur-sm' : ''} w-full`}
                                    >
                                        <Moment data={momentData} />
                                    </div>
                                )
                            }}
                        </For>
                    </div>
                </Show>
            </div>
        </div>
    )
}
