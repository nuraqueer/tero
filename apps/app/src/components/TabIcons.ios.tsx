import { SymbolView } from 'expo-symbols';

export type TabName = 'gathering' | 'circles' | 'messages' | 'help' | 'you';
const symbols = {
  gathering: 'person.3',
  circles: 'circle.circle',
  messages: 'message',
  help: 'square.grid.2x2',
  you: 'person.crop.circle',
} as const;

export function TabIcon({
  name,
  color,
  size = 24,
}: {
  name: TabName;
  color: string;
  size?: number;
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
