import type { ConfigContext, ExpoConfig } from 'expo/config';

/** Separate install for native experiments; preserves the ordinary app's data. */
export default ({ config }: ConfigContext): ExpoConfig => {
  // Published scan previews must target Expo Go's SDK runtime, not the app build version.
  if (process.env.TERO_EXPO_GO_PREVIEW === '1') {
    return {
      ...config,
      runtimeVersion: 'exposdk:57.0.0',
      ios: { ...config.ios, runtimeVersion: 'exposdk:57.0.0' },
      extra: { ...config.extra, teroTesting: true },
    } as ExpoConfig;
  }
  if (process.env.SEFIRAH_NATIVE_BUILD !== '1') return config as ExpoConfig;
  return {
    ...config,
    name: 'Tero Sefirah Dev',
    slug: config.slug ?? 'tero',
    scheme: 'tero-sefirah-dev',
    extra: { ...config.extra, teroTesting: process.env.TERO_NATIVE_TESTING === '1' },
    ios: {
      ...config.ios,
      infoPlist: {
        ...config.ios?.infoPlist,
        ...(process.env.TERO_NATIVE_TESTING === '1'
          ? {
              NSLocalNetworkUsageDescription:
                'Tero connects to the shared local test service to keep your test account available.',
              NSAppTransportSecurity: { NSAllowsLocalNetworking: true },
            }
          : {}),
      },
    },
    android: {
      ...config.android,
      package: 'org.pherus.tero.sefirahdev',
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './config/google-services.sefirah.json',
    },
    updates: { ...config.updates, enabled: false },
  };
};
