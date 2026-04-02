import { For, Show, type Component } from 'solid-js'
import { Moment } from './Moment'
import { MomentCreator } from './MomentCreator'
import {
    displayedModal,
    displayType,
    getFilteredMoments,
    setDisplayType,
} from '../modules/globals'

const fullDisplayClasses =
    'flex h-full w-full flex-col items-center gap-4 rounded-xl'

const gridDisplayClasses = 'grid grid-cols-4 gap-2'

export const Feed: Component = () => {
    return (
        <div class="bg-element pt flex w-full items-center justify-center gap-2 rounded-xl p-2 lg:p-4">
            <div class={'flex h-full w-[90%] flex-col items-center gap-4'}>
                <div
                    class="flex w-full"
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
                            <i class="fa-solid fa-bars text-main hover:cursor-pointer"></i>
                        </Show>
                    </div>
                </div>

                <MomentCreator hide={displayedModal() == 'EDIT_MODAL'} />
                <div
                    class={`${displayType() == 'Full' ? fullDisplayClasses : gridDisplayClasses}`}
                >
                    <For each={getFilteredMoments()}>
                        {(momentData) => {
                            return <Moment data={momentData} />
                        }}
                    </For>
                </div>
            </div>
        </div>
    )
}
