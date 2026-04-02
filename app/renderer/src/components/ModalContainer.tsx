import {
    type Accessor,
    type ComponentProps,
    createMemo,
    For,
    type JSXElement,
    type Setter,
} from 'solid-js'

export interface ModalContainerData<
    T extends string,
> extends ComponentProps<'div'> {
    state: Accessor<T>
    stateSetter: Setter<T>
    modals: Array<{
        state_name: T
        content: JSXElement
    }>
    onClose?: () => void
}

const ModalContainer = <T extends string>(props: ModalContainerData<T>) => {
    let clickStartedOnBackground = false

    const handleMouseDown = (e: MouseEvent) => {
        clickStartedOnBackground = e.target === e.currentTarget
    }

    const handleMouseUp = (e: MouseEvent) => {
        if (clickStartedOnBackground && e.target === e.currentTarget) {
            props.stateSetter('NONE' as any)
            props.onClose?.()
        }
        clickStartedOnBackground = false
    }

    return (
        <div
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            class={`fixed inset-0 z-1000 flex max-h-screen w-full items-center justify-center bg-black/40 backdrop-blur-xs transition-all duration-250 ${
                props.state() === 'NONE'
                    ? 'pointer-events-none opacity-0'
                    : 'pointer-events-auto opacity-100'
            }`}
        >
            <For each={props.modals}>
                {(item) => {
                    const isVisible = createMemo(
                        () => props.state() === item.state_name,
                    )
                    return (
                        <div
                            onclick={(e) => e.stopPropagation()}
                            class={`pointer-events-auto flex w-fit max-w-full items-center justify-center transition-all duration-700 ${
                                isVisible()
                                    ? 'opacity-100'
                                    : 'pointer-events-none fixed opacity-0'
                            } `}
                        >
                            <div
                                class={`grid transition-all duration-500 ease-in-out ${isVisible() ? 'grid-rows-[1fr] delay-300' : 'grid-rows-[0fr]'}`}
                            >
                                {/*If modals cause lag then wrap in show component here*/}
                                <div class="flex max-w-4xl items-center justify-center overflow-hidden">
                                    {item.content}
                                </div>
                            </div>
                        </div>
                    )
                }}
            </For>
        </div>
    )
}

export default ModalContainer
