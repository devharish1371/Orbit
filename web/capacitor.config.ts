import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'app.orbit.couple',
  appName: 'Orbit',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  android: { useLegacyBridge: true },
  plugins: {
    CapacitorHttp: { enabled: true },
    PushNotifications: { presentationOptions: ['badge', 'sound', 'alert'] },
    SplashScreen: { launchShowDuration: 0 },
  },
}

export default config
