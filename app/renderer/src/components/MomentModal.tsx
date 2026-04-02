import { createMemo, Show, type Component, type ComponentProps } from 'solid-js'
import { allMoments } from '../modules/data'
import { displayedMomentModalId } from '../modules/globals'
import { Moment } from './Moment'

export const MomentModal: Component<ComponentProps<'div'>> = () => {
    const momentToDisplay = createMemo(() => {
        const id = displayedMomentModalId()
        return id ? allMoments[id] : null
    })
    return (
        <div class="border-sub bg-element-matte flex aspect-5/7 max-h-[90vh] w-full flex-col items-center gap-4 rounded-4xl border-4 p-8 shadow-2xl">
            <div class="w-full overflow-y-auto">
                <Show when={momentToDisplay()}>
                    <Moment data={momentToDisplay()!} isInsideModal={true} />
                </Show>
            </div>
        </div>
    )
}
