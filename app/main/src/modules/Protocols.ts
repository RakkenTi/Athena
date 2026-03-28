import { protocol } from 'electron'

export const registerProtocols = () => {
    protocol.registerSchemesAsPrivileged([
        {
            scheme: 'athena',
            privileges: {
                standard: true,
                secure: true,
                supportFetchAPI: true,
                bypassCSP: true,
            },
        },
    ])
    console.log('Athena scheme registered!')
}
