import type { Component, ComponentProps } from 'solid-js'

export const ClearFilterButton: Component<ComponentProps<'button'>> = (
    props,
) => (
    <button
        {...props}
        class="text-sub hover:text-danger ml-2 text-xs font-black tracking-widest uppercase transition-all duration-100 hover:scale-105 hover:cursor-pointer active:scale-95"
    >
        [ Clear ]
    </button>
)
