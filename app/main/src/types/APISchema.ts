export interface scrapeData {
    title: string
    description: string
    siteLink: string
    image: string
    video: string
}

export const IpcApi = {
    status: async () => '',
    openExternalBrowser: async (_: string) => undefined,
    // Add read/write methods
    readData: () => new Promise(() => {}) as any,
    writeData: (_: any) => {},
    scrapeWebsiteData: async (_: string) => ({}) as scrapeData,
}

export type IPC_API = typeof IpcApi
