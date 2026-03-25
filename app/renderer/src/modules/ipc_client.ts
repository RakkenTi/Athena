import type { IPC_API } from '../../../main/src/types/APISchema'

export const getApi = () => (window as any).api as IPC_API
