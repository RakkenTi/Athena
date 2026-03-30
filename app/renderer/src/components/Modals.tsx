import {
    deleteMoment,
    momentToDelete,
    setMomentToDelete,
} from '../modules/data'
import {
    displayedModal,
    setDisplayedModal,
    type MODAL_NAMES,
} from '../modules/globals'
import ConfirmModal from './ConfirmModal'
import ModalContainer from './ModalContainer'
import { MomentCreator } from './MomentCreator'

export const Modals = () => (
    <ModalContainer<MODAL_NAMES>
        state={displayedModal}
        stateSetter={setDisplayedModal}
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
                        rejectCallback={() => setMomentToDelete()}
                        acceptCallback={() => {
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
        ]}
    />
)
