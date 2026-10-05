import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { colors, fonts, radii, space } from '@tero/ui';
import { Page } from '@/components/Page';
import { ScreenHeader } from '@/components/ScreenHeader';
import { SoonNote } from '@/components/SoonNote';
import { useLocale } from '@/lib/locale';

/** The map of places members trust. Exact locations are never shown on it. */
export default function MapScreen() {
  const { t } = useLocale();
  return (
    <Page>
      <ScreenHeader title={t('suits.map.title')} />
      <View style={styles.search}>
        <Text style={styles.searchText}>{t('map.search')}</Text>
      </View>
      <View style={styles.map} accessibilityElementsHidden>
        <Svg width="100%" height="100%" viewBox="0 0 300 260" preserveAspectRatio="xMidYMid slice">
          <Path
            d="M20 60c40-20 80 10 120-5s70-30 140-10M10 150c50 10 90-20 140-5s90 20 140 0M40 230c30-20 80-10 110-25s60-10 120 5"
            stroke="rgba(31,30,29,0.1)"
            strokeWidth={10}
            fill="none"
            strokeLinecap="round"
          />
          {[
            [90, 90],
            [170, 120],
            [220, 70],
            [130, 190],
          ].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={26} fill={colors.clay} fillOpacity={0.12} />
          ))}
        </Svg>
      </View>
      <Text style={styles.note}>{t('map.note')}</Text>
      <SoonNote text={t('map.soon')} />
    </Page>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 46,
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radii.pill,
    backgroundColor: colors.paper,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  searchText: { fontFamily: fonts.body, fontSize: 15, color: colors.textMuted },
  map: {
    marginTop: space.md,
    height: 320,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: colors.oatLight,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline,
  },
  note: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: space.md,
  },
});
