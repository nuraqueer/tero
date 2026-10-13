import Svg, { Circle, Path } from 'react-native-svg';
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
const paths: Record<AppIconName, string> = {
  heart: 'M12 20S3 14.5 3 8.5A4.5 4.5 0 0 1 12 8a4.5 4.5 0 0 1 9 .5c0 6-9 11.5-9 11.5Z',
  arrow: 'M5 12h14m-6-6 6 6-6 6',
  search: 'm16 16 5 5',
  close: 'm6 6 12 12M18 6 6 18',
  plus: 'M12 5v14M5 12h14',
  spark: 'm12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3Z',
  pin: 'M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z',
  briefcase: 'M8 6V4h8v2M3 7h18v13H3ZM3 12a24 24 0 0 0 18 0M10 13v2h4v-2',
  book: 'M12 5v16M3 4c4-1 7 0 9 2 2-2 5-3 9-2v15c-4-1-7 0-9 2-2-2-5-3-9-2Z',
  shield: 'm12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Zm-4 9 3 3 5-6',
  chat: 'M3 4h18v13H10l-5 4v-4H3ZM7 9h10M7 12h6',
  people: 'M3 21v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 5v2',
  wave: 'M4 10v4M8 6v12M12 3v18M16 6v12M20 10v4',
  check: 'm5 12 4 4L19 6',
  more: '',
  calendar: 'M4 5h16v16H4ZM8 3v4M16 3v4M4 10h16',
};
export function AppIcon({
  name,
  size = 22,
  color = colors.slate,
}: {
  name: AppIconName;
  size?: number;
  color?: string;
}) {
  const line = {
    fill: 'none',
    stroke: color,
    strokeWidth: 1.65,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Path d={paths[name]} {...line} />
      {name === 'search' && <Circle cx={10.5} cy={10.5} r={6.5} {...line} />}
      {name === 'pin' && <Circle cx={12} cy={10} r={2.3} {...line} />}
      {name === 'people' && <Circle cx={9} cy={8} r={3} {...line} />}
      {name === 'more' &&
        [5, 12, 19].map((x) => <Circle key={x} cx={x} cy={12} r={1.5} fill={color} />)}
    </Svg>
  );
}
