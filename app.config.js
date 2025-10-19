export default ({ config }) => ({
  expo: {
    name: 'AI Budget Tracker',
    slug: 'ai-budget-tracker',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    scheme: 'aibudget',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#05070F'
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#05070F'
      }
    },
    web: {
      bundler: 'metro',
      favicon: './assets/favicon.png'
    },
    plugins: ['expo-router'],
    extra: {
      eas: {
        projectId: '00000000-0000-0000-0000-000000000000'
      },
      EXPO_PUBLIC_SYNC_ENDPOINT: process.env.EXPO_PUBLIC_SYNC_ENDPOINT,
      EXPO_PUBLIC_AI_ENDPOINT: process.env.EXPO_PUBLIC_AI_ENDPOINT,
      EXPO_PUBLIC_RC_APPLE_KEY: process.env.EXPO_PUBLIC_RC_APPLE_KEY,
      EXPO_PUBLIC_RC_GOOGLE_KEY: process.env.EXPO_PUBLIC_RC_GOOGLE_KEY,
      EXPO_PUBLIC_BILLING_ENDPOINT: process.env.EXPO_PUBLIC_BILLING_ENDPOINT,
      EXPO_PUBLIC_ENABLE_ADMIN_CONSOLE: process.env.EXPO_PUBLIC_ENABLE_ADMIN_CONSOLE || 'false'
    }
  }
});
