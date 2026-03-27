import { For, type Component } from 'solid-js'
import { Moment } from './Moment'
import { MomentCreator } from './MomentCreator'
import { getFilteredMoments } from '../../modules/utils'

export const Feed: Component = () => {
    return (
        <div class="bg-element pt flex h-full w-full items-center justify-center gap-2 rounded-xl p-2 lg:p-4">
            <div class="flex h-full w-[90%] flex-col items-center gap-4 rounded-xl p-2 pt-4 lg:p-4 lg:pt-8">
                <MomentCreator />
                <For each={getFilteredMoments()}>
                    {(momentData) => {
                        return <Moment data={momentData} />
                    }}
                </For>
            </div>
        </div>
    )
}
