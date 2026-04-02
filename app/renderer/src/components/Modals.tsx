import { createEffect } from 'solid-js'
import {
    deleteMoment,
    momentToDelete,
    setMomentToDelete,
} from '../modules/data'
import {
    closeMomentModal,
    displayedModal,
    displayedMomentModalId,
    setDisplayedModal,
    type MODAL_NAMES,
} from '../modules/globals'
import ConfirmModal from './ConfirmModal'
import ModalContainer from './ModalContainer'
import { MomentCreator } from './MomentCreator'
import { MomentModal } from './MomentModal'

export const Modals = () => {
    createEffect(() => {
        if (displayedModal() == 'NONE' && displayedMomentModalId())
            setDisplayedModal('DISPLAY_MOMENT_MODAL')
    })

    return (
        <ModalContainer<MODAL_NAMES>
            state={displayedModal}
            stateSetter={setDisplayedModal}
            onClose={() => {
                closeMomentModal()
            }}
            modals={[
                {
                    state_name: 'EDIT_MODAL',
                    content: <MomentCreator />,
                },
                {
                    state_name: 'CONFIRM_MOMENT_DELETE',
                    content: (
                        <ConfirmModal
                            title="Delete Moment?"
                            rejectCallback={() => {
                                setMomentToDelete()
                                if (displayedMomentModalId()) {
                                    setDisplayedModal('DISPLAY_MOMENT_MODAL')
                                }
                            }}
                            acceptCallback={() => {
                                closeMomentModal()
                                const targetMomentId = momentToDelete()
                                if (targetMomentId) {
                                    console.log(
                                        `Attempting to delete ${targetMomentId}`,
                                    )
                                    deleteMoment(targetMomentId)
                                }
                            }}
                        />
                    ),
                },
                {
                    state_name: 'DISPLAY_MOMENT_MODAL',
                    content: <MomentModal />,
                },
            ]}
        />
    )
}
