export const IpcApi = {
    status: async () => '',
    openExternalBrowser: async (_: string) => undefined,
    // Add read/write methods
    readData: () => new Promise(() => {}) as any,
    writeData: (_: any) => {},
    scrapeWebsiteData: async (_: string) => {
        return {
            title: '',
            description: '',
            siteLink: '',
            isImage: true,
            image: '',
            video: '',
        }
    },
}

export type IPC_API = typeof IpcApi
