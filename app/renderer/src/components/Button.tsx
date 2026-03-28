import { type Component, type ComponentProps } from 'solid-js'

interface GenericButtonProps extends ComponentProps<'button'> {
    onClick: () => any
    background_color_classes?: string
    text_colour_classes?: string
}

export const Button: Component<GenericButtonProps> = (props) => (
    <div>
        <button
            onclick={props.onClick}
            class={`w-full rounded-lg ${props.background_color_classes || 'bg-slate-900'} p-4 text-center font-semibold tracking-tight ${props.text_colour_classes || 'text-plain'} text-md shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:scale-105 hover:cursor-pointer hover:shadow-xl active:scale-95 active:duration-50`}
        >
            {props.children}
        </button>
    </div>
)
