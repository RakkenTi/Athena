export default {
    packagerConfig: {
        name: 'Athena',
        executableName: 'athena',
        icon: './assets/icon',
    },
    makers: [
        {
            name: '@electron-forge/maker-squirrel',
            config: {
                name: 'athena',
                setupIcon: './assets/icon.ico',
            },
        },
        {
            name: '@electron-forge/maker-zip',
            platforms: ['darwin'],
            config: {
                name: 'athena',
                setupIcon: './assets/icon.ico',
            },
        },
        {
            name: '@electron-forge/maker-deb',
            config: {
                name: 'athena',
                setupIcon: './assets/icon.ico',
            },
        },
        {
            name: '@electron-forge/maker-rpm',
            config: {
                name: 'athena',
                setupIcon: './assets/icon.ico',
            },
        },
    ],
}
