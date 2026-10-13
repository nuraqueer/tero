import { SymbolView } from 'expo-symbols';
import { colors } from '@tero/ui';
export type AppIconName =
  | 'heart'
  | 'arrow'
  | 'search'
  | 'close'
  | 'plus'
  | 'spark'
  | 'pin'
  | 'briefcase'
  | 'book'
  | 'shield'
  | 'chat'
  | 'people'
  | 'wave'
  | 'check'
  | 'more'
  | 'calendar';
const symbols = {
  heart: 'heart',
  arrow: 'arrow.right',
  search: 'magnifyingglass',
  close: 'xmark',
  plus: 'plus',
  spark: 'sparkles',
  pin: 'mappin.and.ellipse',
  briefcase: 'briefcase',
  book: 'book',
  shield: 'checkmark.shield',
  chat: 'bubble.left',
  people: 'person.2',
  wave: 'waveform',
  check: 'checkmark',
  more: 'ellipsis',
  calendar: 'calendar',
} as const;
export function AppIcon({
  name,
  size = 22,
  color = colors.slate,
}: {
  name: AppIconName;
  size?: number;
  color?: string;
}) {
  return (
    <SymbolView
      name={symbols[name]}
      size={size}
      tintColor={color}
      weight="regular"
      style={{ width: size, height: size }}
      accessibilityElementsHidden
    />
  );
}
