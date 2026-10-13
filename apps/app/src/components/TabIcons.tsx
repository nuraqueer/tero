import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type TabName = 'gathering' | 'circles' | 'messages' | 'help' | 'you';

/** The tab bar icons from the mockups: thin lines that take the tab's colour. */
export function TabIcon({
  name,
  color,
  size = 24,
}: {
  name: TabName;
  color: string;
  size?: number;
}) {
  const line = {
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" accessibilityElementsHidden>
      {name === 'gathering' && (
        <>
          <Circle cx={12} cy={7.5} r={2.5} {...line} />
          <Path
            d="M7 20v-2a5 5 0 0 1 10 0v2M4 9a2 2 0 0 0 0 4M20 9a2 2 0 0 1 0 4M2 20v-2a4 4 0 0 1 3-3.9M22 20v-2a4 4 0 0 0-3-3.9"
            {...line}
          />
        </>
      )}
      {name === 'circles' && (
        <>
          <Circle cx={12} cy={12} r={9} {...line} />
          <Circle cx={12} cy={12} r={4} {...line} />
        </>
      )}
      {name === 'messages' && (
        <Path d="M5 5h14a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H10l-5 4V6a1 1 0 0 1 1-1z" {...line} />
      )}
      {name === 'help' && (
        <>
          <Rect x={4} y={4} width={7} height={7} rx={2} {...line} />
          <Rect x={13} y={4} width={7} height={7} rx={2} {...line} />
          <Rect x={4} y={13} width={7} height={7} rx={2} {...line} />
          <Rect x={13} y={13} width={7} height={7} rx={2} {...line} />
        </>
      )}
      {name === 'you' && (
        <>
          <Circle cx={12} cy={12} r={9} {...line} />
          <Circle cx={12} cy={9} r={2.5} {...line} />
          <Path d="M6 18.5a6 6 0 0 1 12 0" {...line} />
        </>
      )}
    </Svg>
  );
}
