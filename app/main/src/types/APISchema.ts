export interface ScrapeData {
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
    writeMainData: (_: any) => {},
    scrapeWebsiteData: async (_: string, __?: boolean) => ({}) as ScrapeData,
    openFileFromURI: (_: string) => {},
    getFileNameFromURI: (_: string) => '',
    saveFileRef: async (
        _: ArrayBuffer,
        __: string,
    ): Promise<string | undefined> => '',
}

export type IPC_API = typeof IpcApi
