import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.jhanvi.bloom',
  appName: 'Bloom',
  webDir: 'dist',
  server: {
    hostname: 'localhost',
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#f5f5f0',
  },
  ios: {
    backgroundColor: '#f5f5f0',
    contentInset: 'automatic',
    preferredContentMode: 'mobile',
  },
};

export default config;
