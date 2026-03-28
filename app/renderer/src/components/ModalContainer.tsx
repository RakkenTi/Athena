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
}

const ModalContainer = <T extends string>(props: ModalContainerData<T>) => (
    <div
        onclick={() => props.stateSetter('NONE' as any)}
        class={`fixed inset-0 z-1000 flex w-full items-center justify-center bg-black/40 backdrop-blur-xs transition-all duration-250 ${
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
                    <div class="absolute flex w-full items-center justify-center">
                        <div
                            onclick={(e) => e.stopPropagation()}
                            class={`w-xl max-w-full transition-all duration-700 ${
                                isVisible() ? 'opacity-100' : 'opacity-0'
                            } `}
                        >
                            <div
                                class={`grid transition-all duration-500 ease-in-out ${isVisible() ? 'grid-rows-[1fr] delay-300' : 'grid-rows-[0fr]'}`}
                            >
                                {/*If modals cause lag then wrap in show
                                component here*/}
                                <div class="w-xl overflow-hidden">
                                    {item.content}
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }}
        </For>
    </div>
)

export default ModalContainer
