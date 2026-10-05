import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { Asset, requestPermissionsAsync } from 'expo-media-library';

const capture = (view: RefObject<View | null>) =>
  captureRef(view, { format: 'png', quality: 1, result: 'tmpfile' });

/** Opens the share sheet with a picture of the card, so it can go to any app. */
export async function shareCardImage(view: RefObject<View | null>, title: string) {
  const uri = await capture(view);
  await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png', dialogTitle: title });
}

/** Saves a picture of the card to Photos. Asks only for permission to add, never to read. */
export async function saveCardImage(view: RefObject<View | null>): Promise<boolean> {
  const permission = await requestPermissionsAsync(true, ['photo']);
  if (!permission.granted) return false;
  await Asset.create(await capture(view));
  return true;
}
