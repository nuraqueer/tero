import { EmptyState } from '@/components/EmptyState';
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
      <TabHeader title={t('tabs.gathering')} />
      <SectionLabel>{t('gathering.fromCircles')}</SectionLabel>
      <EmptyState
        icon={<TabIcon name="gathering" color={colors.clayText} />}
        title={t('gathering.empty.title')}
        body={t('gathering.empty.body')}
      />
    </Page>
  );
}
