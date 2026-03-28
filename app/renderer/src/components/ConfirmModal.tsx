import { type Component } from 'solid-js'
import { setDisplayedModal } from '../modules/globals'

interface ConfirmModalProps {
    title: string
    label?: string
    rejectCallback: () => any
    acceptCallback: () => any
}

const ConfirmModal: Component<ConfirmModalProps> = (props) => {
    return (
        <div class="border-sub bg-element-matte flex w-xs flex-col gap-4 rounded-4xl border-4 p-8 shadow-2xl md:w-lg">
            <h1 class="text-plain pt-4 text-center text-xl font-bold">
                {props.title || 'ACTION NAME'}
            </h1>
            <p class="text-sub text-center font-bold">
                {props.label || 'Proceed with this action?'}
            </p>
            <div class="flex justify-between pt-4">
                <button
                    onClick={() => {
                        setDisplayedModal('NONE')
                        props.acceptCallback()
                    }}
                    class="bold bg-success text-plain w-1/3 rounded-2xl p-3 font-bold shadow-sm transition-all hover:-translate-y-1 hover:cursor-pointer hover:shadow-md active:scale-95 md:p-4"
                >
                    Confirm
                </button>
                <button
                    onClick={() => {
                        setDisplayedModal('NONE')
                        props.rejectCallback()
                    }}
                    class="bold text-plain bg-danger w-1/3 rounded-2xl p-3 font-bold shadow-sm transition-all hover:-translate-y-1 hover:cursor-pointer hover:shadow-md active:scale-95 md:p-4"
                >
                    Reject
                </button>
            </div>
        </div>
    )
}

export default ConfirmModal
