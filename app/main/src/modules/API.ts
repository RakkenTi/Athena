import type { IPC_API, ScrapeData } from '../types/APISchema'
import { app, BrowserWindow, shell } from 'electron'
import * as cheerio from 'cheerio'
import * as fs from 'node:fs'
import * as path from 'path'
import { ELECTRON_AGENT_REGEX } from '@app/renderer/src/modules/regex'
import { FileName, type dataSnapshot } from '@app/renderer/src/modules/data'
import { uriPrefix } from './Session'
import { MAX_BACKUP_COUNT, MAX_BACKUP_SIZE_IN_MB } from './Settings'

const backupsFolderName = 'backups'
const devDataFileName = 'dev_athena_data.json'
const prodDataFileName = 'athena_data.json'
const devDataFilePath = () =>
    path.join(app.getPath('userData'), devDataFileName)
const prodDataFilePath = () =>
    path.join(app.getPath('userData'), prodDataFileName)
const backupsFolderPath = () =>
    path.join(app.getPath('userData'), backupsFolderName)

const getDataPath = () => {
    if (process.env.DEV) {
        return devDataFilePath()
    } else {
        return prodDataFilePath()
    }
}

const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = `${date.getMonth()}`.padStart(2, '0')
    const day = `${date.getDate()}`.padStart(2, '0')
    return `${year}-${month}-${day}`
}

class PrefixLogger {
    prefix: string

    constructor(prefix: string) {
        this.prefix = prefix
    }

    log(content: string, ...rest: Array<any>) {
        console.log(`[${this.prefix}]: ${content}`, ...rest)
    }
}

const sessionCache: Record<string, Promise<ScrapeData>> = {}

const saveBackup = () => {
    try {
        if (!fs.existsSync(backupsFolderPath())) {
            fs.mkdirSync(backupsFolderPath(), { recursive: true })
        }

        const date = new Date()
        const time = date.getTime()
        date.setUTCHours(0, 0, 0, 0)
        const formattedDate = formatDate(date)

        const backupFilePath = path.join(
            backupsFolderPath(),
            `athena_${formattedDate}-${time}.json`,
        )

        fs.copyFileSync(getDataPath(), backupFilePath)
        checkBackupLimits()
    } catch (error) {
        console.error('Could not write backup. Encountered error!:', error)
    }
}

const checkBackupLimits = async () => {
    const backupFiles = fs.readdirSync(backupsFolderPath())
    const backupStats = backupFiles.map((file) => {
        const fullPath = path.join(backupsFolderPath(), file)
        const stats = fs.statSync(fullPath)
        return {
            name: file,
            path: fullPath,
            size: stats.size,
            time: stats.mtimeMs,
        }
    })

    backupStats.sort((a, b) => a.time - b.time)
    while (backupStats.length > MAX_BACKUP_COUNT) {
        const oldest = backupStats.shift()
        if (oldest) fs.rmSync(oldest.path)
    }

    let totalSize = backupStats.reduce((total, file) => total + file.size, 0)
    const maxSizeBytes = MAX_BACKUP_SIZE_IN_MB * 1024 * 1024

    while (totalSize > maxSizeBytes && backupStats.length > 1) {
        const oldest = backupStats.shift()
        if (oldest) {
            totalSize -= oldest.size
            fs.rmSync(oldest.path)
        }
    }
}

const getContent = (targetKeywords: Array<string>, c: cheerio.CheerioAPI) => {
    for (const keyword of targetKeywords) {
        const selector = `meta[name="${keyword}"], meta[property="${keyword}"]`
        const tag = c(selector)
        const value =
            tag.attr('content') ||
            tag.attr('href') ||
            tag.attr('src') ||
            tag.attr(keyword)
        if (value) {
            return value.trim()
        }
    }
    return ''
}

export const attemptMigrateFile = () => {
    try {
        // old file name is monents_data.json
        const legacyPath = path.join(
            app.getPath('userData'),
            'monents_data.json',
        )
        if (fs.existsSync(legacyPath)) {
            fs.copyFileSync(
                legacyPath,
                path.join(backupsFolderPath(), 'legacy_monents_data.json'),
            )
            fs.renameSync(legacyPath, prodDataFilePath())
        }
    } catch (error) {
        console.warn('Error trying to migrate file:', error)
    }
}

export const Api: IPC_API = {
    status: async () => {
        return 'Preload is working.'
    },
    openExternalBrowser: async (url: string) => {
        shell.openExternal(url)
    },
    readData: () => {
        try {
            const raw = fs.readFileSync(getDataPath(), 'utf-8')
            return JSON.parse(raw)
        } catch {
            return {}
        }
    },
    saveFileRef: async (arrayBuffer: ArrayBuffer, fileName: FileName) => {
        try {
            const userDataPath = app.getPath('userData')
            const attachmentsDir = path.join(userDataPath, 'attachments')

            if (!fs.existsSync(attachmentsDir)) {
                fs.mkdirSync(attachmentsDir, { recursive: true })
            }

            const safeName = fileName.replace(/[^a-z0-9.]/gi, '_').toLowerCase()
            const uniqueFileName = `${new Date().getTime()}_${safeName}`
            const filePath = path.join(attachmentsDir, uniqueFileName)

            fs.writeFileSync(filePath, Buffer.from(arrayBuffer))

            return `athena://${uniqueFileName}`
        } catch (error) {
            console.error(`Failed to save attachment for ${fileName}`, error)
        }
    },
    writeMainData: (mainData: dataSnapshot) => {
        try {
            const targetPath = getDataPath()
            const bufferPath = targetPath + '.tmp'
            console.log(`Attempting to save to ${targetPath}..`)
            const formattedData = JSON.stringify(mainData, null, 2)

            fs.writeFileSync(bufferPath, formattedData, 'utf-8')
            fs.renameSync(bufferPath, targetPath)
            console.log('Saved! Attempting backup...')
            saveBackup()
            console.log('Backup complete.')
        } catch (error) {
            console.error('Failed to save moments data:', error)
        }
    },
    openFileFromURI: (uri: string) => {
        try {
            const appData = app.getPath('userData')
            const relativeFilePath = uri.slice(uriPrefix.length)
            const fullFilePath = path.join(
                appData,
                'attachments',
                relativeFilePath,
            )
            shell.openPath(fullFilePath)
        } catch (error) {
            console.warn(`Failed to open file from uri (${uri}): ${error}`)
        }
    },
    getFileNameFromURI: (uri: string) => {
        try {
            const relativeFilePath = uri.slice(uriPrefix.length)
            const match = relativeFilePath.match(/.+attachment_(.*)/)
            return match ? match[1] : 'File'
        } catch (error) {
            console.warn(`Failed to open file from uri (${uri}): ${error}`)
            return 'File'
        }
    },
    scrapeWebsiteData: async (url: string, force?: boolean) => {
        url = new URL(url).href
        const logger = new PrefixLogger(url)
        if (sessionCache[url] != undefined && force != true) {
            logger.log(`Found cached data for ${url}. Skipping scraping.`)
            return await sessionCache[url]
        }

        const scrapePromise = (async (): Promise<ScrapeData> => {
            try {
                logger.log(`Attempting to scrape ${url}`)
                let targetURL: string = url
                let UserAgent = navigator.userAgent.replace(
                    ELECTRON_AGENT_REGEX,
                    '',
                )

                // Convert twitter links to bypass login
                if (
                    targetURL.includes('twitter.com') ||
                    targetURL.includes('x.com')
                ) {
                    logger.log('Twitter link! Transforming to alternative')
                    targetURL = url.replace(
                        /twitter\.com|x\.com/,
                        'vxtwitter.com',
                    )
                    UserAgent = 'facebookexternalhit/1.1'
                }

                // Special reddit handling
                if (
                    targetURL.includes('reddit.com') ||
                    targetURL.includes('rxddit.com')
                ) {
                    logger.log(
                        'Reddit link detected. Using JSON bypass for high-res media.',
                    )

                    const jsonUrl =
                        targetURL.split('?')[0].replace(/\/$/, '') + '.json'

                    try {
                        const response = await fetch(jsonUrl)
                        const json = await response.json()

                        const post = json[0].data.children[0].data

                        const bestImage =
                            post.url_overridden_by_dest || post.thumbnail

                        return {
                            title: post.title,
                            description: `r/${post.subreddit} • u/${post.author}`,
                            siteLink: 'reddit.com',
                            image: bestImage,
                            video: post.is_video
                                ? post.media?.reddit_video?.fallback_url
                                : '',
                        } as ScrapeData
                    } catch (e) {
                        logger.log(
                            'Reddit JSON bypass failed, falling back to standard scrape...',
                            e,
                        )
                    }
                }

                let HTML = ''
                const hostname = new URL(targetURL).hostname
                const headerOptions = {
                    'User-Agent': UserAgent,
                }

                // Fetch
                try {
                    logger.log('Trying normal fetch')
                    const response = await fetch(targetURL, {
                        headers: headerOptions,
                        signal: AbortSignal.timeout(15000),
                    })

                    if (response.ok) {
                        const tempHTML = await response.text()
                        const isImage = response.headers
                            .get('content-type')
                            ?.match('image')

                        if (isImage) {
                            logger.log('Is direct image! Returning.')
                            return {
                                title: targetURL.trim(),
                                description: 'Image',
                                siteLink: targetURL.trim(),
                                image: url,
                                video: '',
                            } as ScrapeData
                        }

                        // Must check to see if it even has data.
                        const _$ = cheerio.load(tempHTML)

                        if (
                            getContent(
                                [
                                    'og:video:url',
                                    'og:video',
                                    'twitter:player',
                                    'video_src',
                                    'twitter:image',
                                    'og:image',
                                    'image_src',
                                ],
                                _$,
                            ) != ''
                        ) {
                            HTML = tempHTML
                            logger.log(`Fetched`)
                        } else {
                            logger.log('Inital getContent check failed.')
                        }
                    }
                } catch (error) {
                    logger.log(`Could not fetch ${targetURL}`, error)
                }

                // Heavy External Window
                if (HTML == '') {
                    logger.log(
                        `Normal fetch failed for ${targetURL}. Trying via external window.`,
                    )
                    const tempWindow = new BrowserWindow({
                        show: false,
                        webPreferences: {
                            offscreen: true,
                        },
                    })

                    try {
                        let tempUserAgent =
                            tempWindow.webContents.getUserAgent()
                        tempUserAgent = tempUserAgent.replace(
                            ELECTRON_AGENT_REGEX,
                            '',
                        )

                        await tempWindow.loadURL(targetURL, {
                            userAgent: tempUserAgent,
                        })

                        await new Promise<void>((resolve) =>
                            setTimeout(() => {
                                resolve()
                            }, 5000),
                        )

                        HTML = await tempWindow.webContents.executeJavaScript(
                            'document.documentElement.outerHTML',
                        )
                    } catch (error) {
                        logger.log(
                            `Error while trying to scrape ${targetURL} via an external window:`,
                            error,
                        )
                    } finally {
                        tempWindow.destroy()
                    }
                }

                const $ = cheerio.load(HTML)

                const title =
                    getContent(['twitter:title', 'og:title'], $) ||
                    $('title').text() ||
                    hostname

                const siteLink = getContent(['og:site_name'], $) || hostname

                const description = getContent(
                    ['twitter:description', 'og:description', 'description'],
                    $,
                )

                const video = getContent(
                    [
                        'twitter:player:stream',
                        'og:video',
                        'og:video:url',
                        'og:video:secure_url',
                        'twitter:player',
                        'video_src',
                    ],
                    $,
                )

                const image = getContent(
                    ['twitter:image', 'og:image', 'image_src'],
                    $,
                )

                logger.log(`Finished scraping data from ${targetURL} (${url})`)

                const data = {
                    title: title.trim(),
                    description: description.trim(),
                    siteLink: siteLink.trim(),
                    image,
                    video,
                } as ScrapeData

                return data
            } catch (error) {
                console.error('Scraping failed (All steps): ', error)
                delete sessionCache[url]
            }
            return {
                title: 'Fetch Failed',
                description: 'Fetch Failed',
                siteLink: '',
                image: '',
                video: '',
            }
        })()

        sessionCache[url] = scrapePromise

        return scrapePromise
    },
}
