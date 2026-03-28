import path from 'node:path'
const __dirname = import.meta.dirname

export default {
    packagerConfig: {
        name: 'Athena',
        executableName: 'athena',
        icon: path.join(__dirname, 'assets', 'icon'),
        asar: true,
    },
    makers: [
        // Windows
        {
            name: '@electron-forge/maker-squirrel',
            config: {
                name: 'athena',
                iconUrl: path.join(__dirname, 'assets', 'icon.ico'),
                setupIcon: path.join(__dirname, 'assets', 'icon.ico'),
            },
        },
        {
            name: '@electron-forge/maker-zip',
            platforms: ['darwin'],
            config: {
                name: 'athena',
                iconUrl: path.join(__dirname, 'assets', 'icon.ico'),
                setupIcon: path.join(__dirname, 'assets', 'icon.icon'),
            },
        },

        // Debian (ubuntu)
        {
            name: '@electron-forge/maker-deb',
            config: {
                name: 'athena',
                options: {
                    icon: path.join(__dirname, 'assets', 'icon.png'),
                },
            },
        },

        // Fedora
        {
            name: '@electron-forge/maker-rpm',
            config: {
                name: 'athena',
                options: {
                    name: 'athena',
                    genericName: 'Personal Blog Archive and Notes',
                    categories: ['Utility'],
                    icon: path.join(__dirname, 'assets', 'icon.png'),
                },
            },
        },
    ],
}
