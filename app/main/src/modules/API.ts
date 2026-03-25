import type { IPC_API } from '../types/APISchema' // Import the interface
import { app, BrowserWindow, shell } from 'electron'
import * as cheerio from 'cheerio'
import * as fs from 'node:fs'
import * as path from 'path'
import { ELECTRON_AGENT_REGEX } from '@app/renderer/src/modules/regex'

const getDataPath = () => {
    if (process.env.DEV) {
        console.log('Dev environemnt detected. Returning alternate data.json')
        return path.join(app.getPath('userData'), 'dev_monents_data.json')
    } else {
        return path.join(app.getPath('userData'), 'monents_data.json')
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
        } catch (error) {
            return {}
        }
    },
    writeData: (data: any) => {
        try {
            console.log('Received data to write:', data)
            const targetPath = getDataPath()
            const bufferPath = targetPath + '.tmp'
            const formattedData = JSON.stringify(data)
            console.log(formattedData)

            fs.writeFileSync(bufferPath, formattedData, 'utf-8')
            fs.renameSync(bufferPath, targetPath)
            console.log('Wrote to:', bufferPath)
        } catch (error) {
            console.error('Failed to save moments data:', error)
        }
    },
    scrapeWebsiteData: async (url: string) => {
        let targetUrl: string = url

        // Convert twitter links to bypass login
        if (targetUrl.includes('twitter.com') || targetUrl.includes('x.com')) {
            targetUrl = url.replace(/twitter\.com|x\.com/, 'vxtwitter.com')
        }

        const isSocial = url.includes('vxtwitter.com') || url.includes('x.com')
        const headersOptions = {
            'User-Agent': isSocial
                ? 'facebookexternalhit/1.1'
                : navigator.userAgent.replace(ELECTRON_AGENT_REGEX, ''),
        }

        const hostname = new URL(targetUrl).hostname
        const response = await fetch(targetUrl, { headers: headersOptions })
        const contentType = response.headers.get('content-type') || ''
        const isDirectImage = contentType.startsWith('image/')

        if (isDirectImage) {
            return {
                title: hostname,
                description: '',
                siteLink: hostname,
                isImage: true,
                image: targetUrl,
                video: '',
            }
        }

        const tempWindow = new BrowserWindow({
            show: false,
            webPreferences: {
                offscreen: true,
            },
        })

        let fullHTML = ''
        if (!response.ok) {
            try {
                let userAgent = tempWindow.webContents.getUserAgent()

                console.log('Temp window user agent:', userAgent)
                userAgent = userAgent.replace(ELECTRON_AGENT_REGEX, '')
                console.log('Stripped temp window user agent to:', userAgent)

                await tempWindow.loadURL(targetUrl, {
                    userAgent,
                })

                await new Promise<void>((resolve) =>
                    setTimeout(() => {
                        console.log('Timed out.')
                        resolve()
                    }, 2500),
                )

                fullHTML = await tempWindow.webContents.executeJavaScript(
                    'document.documentElement.outerHTML',
                )
            } catch (error) {
                console.error(`Heavy scraping failed. Error: ${error}`)
            } finally {
                tempWindow.destroy()
            }
        }

        // its scraping time
        const rawHTML = fullHTML || (await response.text())
        const $ = cheerio.load(rawHTML)

        const getContent = (targetKeywords: Array<string>) => {
            for (const keyword of targetKeywords) {
                const selector = `meta[name="${keyword}"], meta[property="${keyword}"]`
                const tag = $(selector)
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

        const title =
            getContent(['twitter:title', 'og:title']) ||
            $('title').text() ||
            hostname

        const siteLink = getContent(['og:site_name']) || hostname

        const description = getContent([
            'twitter:description',
            'og:description',
            'description',
        ])

        const video = getContent([
            'og:video:url',
            'og:video',
            'twitter:player',
            'video_src',
        ])

        let image = getContent(['twitter:image', 'og:image', 'image_src'])

        return {
            title: title.trim(),
            description: description.trim(),
            siteLink: siteLink.trim(),
            isImage: isDirectImage,
            image,
            video,
        }
    },
}
