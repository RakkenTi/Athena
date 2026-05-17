import type { Component, ComponentProps } from 'solid-js'
import { Show, createMemo } from 'solid-js'
import {
    setDisplayedModal,
    setDisplayedMomentModalId,
    type ContentPart,
} from '../modules/globals'
import { allMoments, type MomentId } from '../modules/store'
import { Moment } from './Moment'

export const InlineReference: Component<
    { contentPart: ContentPart } & ComponentProps<'div'>
> = (props) => {
    const reference = createMemo(() => {
        let targetId = (props.contentPart.targetId || '') as MomentId
        let targetMomentData = allMoments[targetId]

        if (!targetMomentData) {
            Object.values(allMoments).some((moment) => {
                if (
                    moment.title.toLowerCase() ===
                    props.contentPart.body.toLowerCase()
                ) {
                    targetMomentData = moment
                    targetId = moment.uuid
                    return true
                }
            })
        }

        return { id: targetId, data: targetMomentData }
    })

    const displayTitle = () =>
        reference().data ? reference().data.title : props.contentPart.body

    return (
        <div
            class="bg-element-matte border-element-accent hover:border-highlight relative my-4 flex w-full flex-col gap-2 overflow-hidden rounded-xl border p-4 text-left transition-colors hover:cursor-pointer hover:shadow-md"
            onClick={(e) => {
                e.stopPropagation()
                if (reference().data) {
                    setDisplayedMomentModalId(reference().id)
                    setDisplayedModal('DISPLAY_MOMENT_MODAL')
                }
            }}
        >
            <div class="text-highlight-strongest z-10 flex items-center gap-2 font-bold">
                <i class="fa-solid fa-link text-[10px] opacity-60"></i>
                <span>{displayTitle()}</span>
            </div>

            <Show when={reference().data?.content}>
                <div class="pointer-events-none relative max-h-48 overflow-hidden opacity-80">
                    <Moment data={reference().data!} isPreview={true} />
                    <div class="from-element-matte absolute right-0 bottom-0 left-0 z-10 h-20 bg-linear-to-t to-transparent"></div>
                </div>
            </Show>
        </div>
    )
}
