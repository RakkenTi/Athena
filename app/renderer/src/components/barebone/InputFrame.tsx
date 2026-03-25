import { type Component, splitProps } from 'solid-js'
import { Frame } from './Frame'
import { type JSX } from 'solid-js/h/jsx-runtime'

interface inputboxProps extends JSX.InputHTMLAttributes<HTMLInputElement> {
    label: string
}

export const InputFrame: Component<inputboxProps> = (props) => {
    const [_, others] = splitProps(props, ['label'])

    return (
        <Frame
            content={
                <>
                    <input
                        {...(others as any)}
                        class="w-full text-left outline-none"
                    ></input>
                </>
            }
        />
    )
}
