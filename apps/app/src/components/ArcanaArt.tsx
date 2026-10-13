import Svg, { Circle, G, Path } from 'react-native-svg';
import { tarot } from '@tero/ui';

const star = 'M50 40 53 49 62 52 53 55 50 64 47 55 38 52 47 49Z';

/** Deliberate, geometric symbols: each major keeps one clear visual idea. */
function Symbol({ arcana }: { arcana?: number | null }) {
  switch (arcana) {
    case 0:
      return (
        <>
          <Path d="M24 60q26-24 52 0-26 24-52 0Z" />
          <Circle cx={50} cy={60} r={9} />
          <Path d="m50 54 1.5 4.5L56 60l-4.5 1.5L50 66l-1.5-4.5L44 60l4.5-1.5L50 54ZM30 77q-3 15 4 24m9-19q-2 17 1 24m13-24q2 17-1 24m14-29q3 15-4 24M37 35q13-7 26 0" />
        </>
      );
    case 1:
      return (
        <>
          <Path d="M31 48c0-12 13-13 19 0 6-13 19-12 19 0s-13 13-19 0c-6 13-19 12-19 0Z" />
          <Path d="M39 104 58 76m-15 30 19-28m-2-13 2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" />
        </>
      );
    case 2:
      return (
        <>
          <Path d="M55 35c-19-2-26 22-11 33 8 6 18 3 23-3-17 2-27-17-12-30ZM28 43v56m44-56v56M24 43h8m36 0h8M24 99h8m36 0h8M40 85h20m-20 6h20" />
        </>
      );
    case 3:
      return (
        <>
          <Path d="m29 42 5 18h32l5-18-12 8-9-17-9 17-12-8ZM35 66h30" />
          <Circle cx={50} cy={84} r={11} />
          <Path d="M50 95v13m-7-6h14" />
        </>
      );
    case 4:
      return (
        <>
          <Path d="m36 32 4 12h20l4-12-9 5-5-10-5 10-9-5ZM34 55h32v37H34ZM27 61v39h46V61M27 100v10m46-10v10M41 92V65h18v27" />
          <Path d="M50 67v17m-5-11h10m-5 11-3-3m3 3 3-3" />
        </>
      );
    case 5:
      return (
        <>
          <Path d="M50 27v27M42 35h16M38 43h24" />
          <Circle cx={30} cy={68} r={8} />
          <Circle cx={70} cy={68} r={8} />
          <Path d="m36 74 32 30m-10-9 5-5m-15-4 5-5M64 74l-32 30m10-9-5-5m15-4-5-5" />
        </>
      );
    case 6:
      return (
        <>
          <Path d="M40 53c-13-15-28 2-15 14l15 14 15-14c13-12-2-29-15-14ZM60 64c-13-15-28 2-15 14l15 14 15-14c13-12-2-29-15-14Z" />
          <Path d="M50 30v8m-4-4h8M42 104q8 5 16 0" />
        </>
      );
    case 7:
      return (
        <>
          <Path d="m27 52 7-13h32l7 13H27Zm7 0v29m32-29v29M29 81h42l-5 14H34l-5-14ZM50 62v13m-6-7h12" />
          <Circle cx={36} cy={103} r={7} />
          <Circle cx={64} cy={103} r={7} />
        </>
      );
    case 8:
      return (
        <>
          <Path d="M35 35c0-7 9-8 15 0 6-8 15-7 15 0s-9 8-15 0c-6 8-15 7-15 0ZM50 50c-27 0-28 37-12 47l12 12 12-12c16-10 15-47-12-47Z" />
          <Path d="m37 65-5-6m31 6 5-6M38 79l5 1m14 0 5-1m-17 10h10l-5 6-5-6Zm5 6v6m-6-1q6 5 12 0" />
        </>
      );
    case 9:
      return (
        <>
          <Path d="M40 41v-8c0-8 10-8 10 0v8M28 52l17-11 17 11v45H28V52Zm0 0h34M34 58h22v33H34ZM25 101h40M74 29v79" />
          <Path d="m45 64 2.5 8 8 2.5-8 2.5-2.5 8-2.5-8-8-2.5 8-2.5 2.5-8Z" />
        </>
      );
    default:
      return <Path d={star} />;
  }
}
export function ArcanaArt({
  arcana,
  width,
  compact = false,
}: {
  arcana?: number | null;
  width: number;
  compact?: boolean;
}) {
  return (
    <Svg
      width={width}
      height={compact ? width : width * 1.4}
      viewBox={compact ? '14 24 72 88' : '0 0 100 140'}
      accessibilityElementsHidden
    >
      <G
        fill="none"
        stroke={tarot.ink}
        strokeWidth={compact ? 2.5 : 1.1}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <Symbol arcana={arcana} />
      </G>
      {!compact && (
        <G fill={tarot.line}>
          <Circle cx={18} cy={41} r={0.8} />
          <Circle cx={80} cy={96} r={0.8} />
          <Path d="m76 32 1.2 3.8 3.8 1.2-3.8 1.2-1.2 3.8-1.2-3.8-3.8-1.2 3.8-1.2Z" />
        </G>
      )}
    </Svg>
  );
}
