import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type TabName = 'gathering' | 'circles' | 'messages' | 'help' | 'you';

/** The tab bar icons from the mockups: thin lines that take the tab's colour. */
export function TabIcon({ name, color }: { name: TabName; color: string }) {
  const line = {
    fill: 'none',
    stroke: color,
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  } as const;
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" accessibilityElementsHidden>
      {name === 'gathering' && (
        <>
          <Circle cx={12} cy={12} r={9} {...line} />
          <Circle cx={12} cy={8.5} r={1.6} {...line} />
          <Circle cx={8.6} cy={14.2} r={1.6} {...line} />
          <Circle cx={15.4} cy={14.2} r={1.6} {...line} />
        </>
      )}
      {name === 'circles' && (
        <>
          <Circle cx={9} cy={12} r={6} {...line} />
          <Circle cx={15} cy={12} r={6} {...line} />
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
          <Rect x={6} y={3} width={12} height={18} rx={2} {...line} />
          <Path
            d="M12 8.5l1.1 2.3 2.5.3-1.8 1.7.4 2.5-2.2-1.2-2.2 1.2.4-2.5-1.8-1.7 2.5-.3z"
            {...line}
          />
        </>
      )}
    </Svg>
  );
}
