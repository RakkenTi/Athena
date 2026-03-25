import { type Component } from 'solid-js'

interface LineProps {
    class?: string
}

export const Line: Component<LineProps> = (props) => (
    <div class={`rounded-full transition-all ${props.class}`}></div>
)
