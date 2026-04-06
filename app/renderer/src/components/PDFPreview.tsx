import {
    createSignal,
    onMount,
    Show,
    type Component,
    type ComponentProps,
} from 'solid-js'
import * as pdfjs from 'pdfjs-dist'
import { maxImageHeight } from '../modules/globals'

export const LocalPDFPreview: Component<
    ComponentProps<'div'> & {
        uri: string
    }
> = (props) => {
    const [thumbnail, setThumbnail] = createSignal<string>('')

    onMount(async () => {
        try {
            const loadingTask = pdfjs.getDocument(props.uri)
            const pdf = await loadingTask.promise
            const page = await pdf.getPage(1)

            const viewport = page.getViewport({ scale: 1.5 })
            const canvas = document.createElement('canvas')
            const context = canvas.getContext('2d')

            canvas.height = viewport.height
            canvas.width = viewport.width

            await page.render({
                canvasContext: context!,
                viewport,
                canvas: canvas,
            }).promise
            setThumbnail(canvas.toDataURL('image/webp', 0.8))
        } catch (error) {
            console.error('Failed to generate PDF thumbnail:', error)
        }
    })

    return (
        <div class="flex w-full flex-col gap-2 p-2">
            <span class="text-highlight-alt-strong text-lg font-black">
                Local Document (PDF)
            </span>
            <div class="border-highlight-alt bg-element-matte group relative flex w-full items-center justify-center overflow-hidden rounded-xl border">
                <Show
                    when={thumbnail()}
                    fallback={
                        <div class="text-sub flex h-32 animate-pulse items-center justify-center text-sm font-bold">
                            Rendering Preview...
                        </div>
                    }
                >
                    <div
                        class="pointer-events-none absolute inset-0 scale-150 opacity-40 blur-xl transition-all group-hover:opacity-60"
                        style={{
                            'background-image': `url(${thumbnail()})`,
                            'background-size': 'contain',
                            'background-position': 'center',
                        }}
                    />
                    <img
                        src={thumbnail()}
                        class={`bg-element z-10 ${maxImageHeight()} w-full rounded object-contain shadow-lg hover:cursor-pointer`}
                    />
                </Show>
            </div>
        </div>
    )
}
