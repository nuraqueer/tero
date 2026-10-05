import type { RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

const fileName = 'tero-card.png';

async function capture(view: RefObject<View | null>): Promise<File> {
  const dataUrl = await captureRef(view, { format: 'png', quality: 1, result: 'data-uri' });
  const blob = await (await fetch(dataUrl)).blob();
  return new File([blob], fileName, { type: 'image/png' });
}

function download(file: File) {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Uses the browser's share sheet where there is one (phones), otherwise downloads. */
export async function shareCardImage(view: RefObject<View | null>, title: string) {
  const file = await capture(view);
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], title });
  } else {
    download(file);
  }
}

export async function saveCardImage(view: RefObject<View | null>): Promise<boolean> {
  download(await capture(view));
  return true;
}
