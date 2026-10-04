export const en = {
  'app.tagline': 'Queer people helping each other, everywhere.',
  'welcome.body': 'Tero is invite-only. To join, someone who trusts you hands you a Tero card.',
  'welcome.haveCard': 'I have a Tero card',
  'welcome.readGuides': 'Read the open guides',
  'welcome.language': 'Language',
  'lock.enterPasscode': 'Enter your passcode',
  'card.changesIn': 'Changes in {seconds}s',
} as const;

export type MessageKey = keyof typeof en;
