import type { IPC_API, scrapeData } from '../types/APISchema' // Import the interface
import { app, BrowserWindow, shell } from 'electron'
import * as cheerio from 'cheerio'
import * as fs from 'node:fs'
import * as path from 'path'
import { ELECTRON_AGENT_REGEX } from '@app/renderer/src/modules/regex'

const getDataPath = () => {
    if (process.env.DEV) {
        return path.join(app.getPath('userData'), 'dev_monents_data.json')
    } else {
        return path.join(app.getPath('userData'), 'monents_data.json')
    }
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

const sessionCache: Record<string, Promise<scrapeData>> = {}

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
        } catch (error) {
            return {}
        }
    },
    writeData: (data: any) => {
        try {
            const targetPath = getDataPath()
            const bufferPath = targetPath + '.tmp'
            const formattedData = JSON.stringify(data)

            fs.writeFileSync(bufferPath, formattedData, 'utf-8')
            fs.renameSync(bufferPath, targetPath)
        } catch (error) {
            console.error('Failed to save moments data:', error)
        }
    },
    scrapeWebsiteData: async (url: string) => {
        url = new URL(url).href
        if (sessionCache[url] != undefined) {
            console.log(`Found cached data for ${url}. Skipping scraping.`)
            return await sessionCache[url]
        }

        const scrapePromise = (async () => {
            try {
                const logger = new PrefixLogger(url)
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

                let image = getContent(
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
                }

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
