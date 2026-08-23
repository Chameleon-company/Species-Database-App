import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: '...',
    appName: '...',
    webDir: '../Frontend',

    server: {
        androidScheme: 'http',
        cleartext: true
    },

    android: {
        allowMixedContent: true
    }
};

export default config;