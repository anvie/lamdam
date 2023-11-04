"use client";
import { Modal } from "@nextui-org/react";
import React, { FunctionComponent, ReactNode } from "react";

export interface ModalProps {
    onClosed?: () => Promise<void> | void
    closeModal?: (e?: any) => void
    showCloseBtn?: boolean
    size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl" | "5xl"
}

type ModalBodyType<T> = FunctionComponent<T & ModalProps>

type ModalAction<T = any> = {
    type: 'show' | 'hide' | 'afterClosed'
    modalTitle?: string | null
    modalBody?: ModalBodyType<T>
    modalProps?: ModalProps
}

type Dispatch = (action: ModalAction) => void

type ModalState<T = any> = {
    isModalOpen: boolean
    modalTitle?: string | null
    modalBody?: ModalBodyType<T> | null
    modalProps?: ModalProps | null
}


const ModalContext = React.createContext<{
    state: ModalState;
    dispatch: Dispatch;
} | undefined>(undefined)

const modalReducer = (state: ModalState, action: ModalAction): ModalState => {
    switch (action.type) {
        case 'show': {
            return {
                isModalOpen: true,
                modalTitle: action.modalTitle,
                modalBody: action.modalBody,
                modalProps: action.modalProps
            }
        }
        case 'hide': {
            return {
                ...state,
                isModalOpen: false,
            }
        }
        case 'afterClosed': {
            return {
                isModalOpen: false,
                modalTitle: null,
                modalBody: null,
                modalProps: null
            }
        }
        default: {
            throw new Error(`Unhandled action type: ${action.type}`)
        }
    }
}

export const ModalProvider = ({ children }: { children: ReactNode }) => {
    const [state, dispatch] = React.useReducer(modalReducer, {
        isModalOpen: false,
    })
    const closeModal = () => dispatch({ type: 'hide' })

    return (
        <ModalContext.Provider value={{ state, dispatch }}>
            <Modal
                key={state.modalTitle}
                isOpen={state.isModalOpen}
                onOpenChange={(isOpen) => {
                    if (!isOpen) {
                        dispatch({ type: 'hide' })
                    }
                }}
                onClose={() => dispatch({ type: 'afterClosed' })}
                radius="md"
                size={state.modalProps?.size ?? "5xl"}
                placement="top"
                isDismissable={false}
                isKeyboardDismissDisabled
                hideCloseButton
                classNames={{
                    backdrop: "bg-opacity-90",
                }}
            >
                {state.modalBody && (
                    <React.Fragment>
                        {React.createElement(state.modalBody as FunctionComponent<ModalProps>, {
                            ...state.modalProps,
                            closeModal,
                        })}
                    </React.Fragment>
                )}
            </Modal>

            {children}
        </ModalContext.Provider>
    )
}

type ModalContextType = {
    showModal: <T extends ModalProps>(
        modalTitle: string,
        modalBody: ModalBodyType<T & ModalProps>,
        props?: T & ModalProps
    ) => void
    hideModal: () => void
}

export const useModal = () => {
    const context = React.useContext(ModalContext)
    if (context === undefined) {
        throw new Error('useModal must be used within a ModalProvider')
    }

    const actions: ModalContextType = {
        showModal: (modalTitle, modalBody, props) =>
            context.dispatch({ type: "show", modalTitle, modalBody, modalProps: props }),
        hideModal: () => context.dispatch({ type: 'hide' }),
    }

    return actions
}