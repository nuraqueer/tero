import Constants from 'expo-constants';

/** Test tools are visible in development and explicitly published test previews. */
export const isTestingBuild = __DEV__ || Constants.expoConfig?.extra?.teroTesting === true;
