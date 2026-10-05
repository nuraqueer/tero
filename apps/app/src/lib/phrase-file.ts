import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { phraseFileText } from '@tero/crypto';

export const phraseFileName = 'tero-recovery-words.txt';

/**
 * Hands the 12 words to the phone's share sheet as a .txt file, so the person chooses
 * where it goes (Files, a USB drive, a printer). The copy in the app's cache is deleted
 * as soon as the sheet closes.
 */
export async function savePhraseFile(phrase: string, title: string): Promise<void> {
  const file = new File(Paths.cache, phraseFileName);
  try {
    if (file.exists) file.delete();
    file.create();
    file.write(phraseFileText(phrase));
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/plain',
      UTI: 'public.plain-text',
      dialogTitle: title,
    });
  } finally {
    if (file.exists) file.delete();
  }
}
