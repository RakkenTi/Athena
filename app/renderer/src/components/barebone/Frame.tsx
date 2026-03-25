import { type Component, type JSXElement } from 'solid-js'

interface inputFrameProps {
    content: JSXElement
}

export const Frame: Component<inputFrameProps> = (props) => (
    <div class="lg:text-md bg-element-accent hover:border-element-accent-highlight border-highlight flex w-full justify-between rounded-lg border p-1 text-left text-xs font-semibold tracking-tight whitespace-nowrap text-slate-400 transition-all duration-200 hover:border lg:p-2 lg:px-4">
        {props.content}
    </div>
)
