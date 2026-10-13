import { Platform } from 'react-native';
import { navigation } from '@tero/ui';

/** Shared resting position for the tab capsule and chat composer. */
export function bottomControlOffset(inset: number): number {
  if (Platform.OS === 'ios') return 15;
  if (Platform.OS === 'android') return inset + navigation.androidBottomGap;
  return inset + navigation.bottomGap;
}
