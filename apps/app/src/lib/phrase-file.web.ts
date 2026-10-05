import { phraseFileText } from '@tero/crypto';

export const phraseFileName = 'tero-recovery-words.txt';

/** Downloads the 12 words as a .txt file. The browser decides the folder. */
export async function savePhraseFile(phrase: string, _title: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([phraseFileText(phrase)], { type: 'text/plain' }));
  try {
    const link = document.createElement('a');
    link.href = url;
    link.download = phraseFileName;
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Give the download a moment to start before the link stops working.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
