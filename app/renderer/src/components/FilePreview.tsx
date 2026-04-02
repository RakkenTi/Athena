import {
    createMemo,
    createResource,
    Show,
    type Component,
    type ComponentProps,
} from 'solid-js'
import { getApi } from '../modules/ipc_client'
import { maxImageHeight } from '../modules/globals'

const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'avif']

export const FilePreview: Component<
    ComponentProps<'div'> & {
        uri: string
    }
> = (props) => {
    const isImage = createMemo(() => {
        const extension = props.uri.split('.').pop()?.toLowerCase() || ''
        return imageExtensions.includes(extension)
    })

    const [fileName] = createResource(() =>
        getApi().getFileNameFromURI(props.uri),
    )

    return (
        <div class="group bg-highlight border-sub hover:border-highlight-strongest flex w-full flex-col justify-center gap-1 rounded border-2 transition-all duration-300">
            <Show
                when={isImage()}
                fallback={
                    <div
                        onClick={() => getApi().openFileFromURI(props.uri)}
                        class="group flex w-full items-center justify-between gap-2 p-2 group-hover:cursor-pointer"
                    >
                        <span class="text-highlight-alt-strong text-lg font-black">
                            File
                        </span>
                        <span class="text-highlight-strong text-xs font-bold">
                            {fileName()}
                        </span>
                    </div>
                }
            >
                <div
                    class="hover:cursor-pointer"
                    onClick={() => {
                        getApi().openFileFromURI(props.uri)
                    }}
                >
                    <div class="flex w-full flex-col gap-2 p-2">
                        <span class="text-highlight-alt-strong text-lg font-black">
                            Local Image
                        </span>
                        <div class="border-highlight-alt bg-element-matte group relative flex w-full items-center justify-center overflow-hidden rounded-xl border">
                            <div
                                class="pointer-events-none absolute inset-0 scale-150 opacity-40 blur-xl transition-all group-hover:opacity-60"
                                style={{
                                    'background-image': `url(${props.uri || ''})`,
                                    'background-size': 'contain',
                                    'background-position': 'center',
                                }}
                            />
                            <img
                                src={props.uri}
                                class={`bg-element z-10 ${maxImageHeight()} w-full rounded object-contain hover:cursor-pointer`}
                            ></img>
                        </div>
                    </div>
                </div>
            </Show>
        </div>
    )
}
