import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { EmptyState } from '@/components/EmptyState';
import { RoundButton } from '@/components/ScreenHeader';
import { Page } from '@/components/Page';
import { SectionLabel } from '@/components/SectionLabel';
import { TabHeader } from '@/components/TabHeader';
import { TabIcon } from '@/components/TabIcons';
import { colors } from '@tero/ui';
import { useLocale } from '@/lib/locale';

/** Home: posts and live Spaces from your Circles. A live Space will float at the top. */
export default function Gathering() {
  const { t } = useLocale();
  return (
    <Page tabs>
      <TabHeader
        title={t('tabs.gathering')}
        right={
          <RoundButton label={t('compose.title')} onPress={() => router.push('/compose')}>
            <Svg width={20} height={20} viewBox="0 0 24 24">
              <Path
                d="M12 5v14M5 12h14"
                stroke={colors.slate}
                strokeWidth={2}
                strokeLinecap="round"
              />
            </Svg>
          </RoundButton>
        }
      />
      <SectionLabel>{t('gathering.fromCircles')}</SectionLabel>
      <EmptyState
        icon={<TabIcon name="gathering" color={colors.clayText} />}
        title={t('gathering.empty.title')}
        body={t('gathering.empty.body')}
      />
    </Page>
  );
}
