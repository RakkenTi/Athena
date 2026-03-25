export const YOUTUBE_ID_REGEX =
    /(youtube\.com|youtu\.be)\/(watch\?v=|)(?<id>[A-Za-z0-9]+)/

export const URL_REGEX = /(https?:\/\/[^\s]+)/g

export const URL_DOMAIN_REGEX = /https?:\/\/(?<domain>[^\s]+)\//

export const URL_MAIN_DOMAIN_REGEX =
    /https?:\/\/(?:[^\s/]+\.)*?(?<domain>[^\s/.]+)\.[a-z]{2,}(?:\/|$)/

export const ELECTRON_AGENT_REGEX = /Electron\/ \d+ \. \d+ \. \d+ \s/
