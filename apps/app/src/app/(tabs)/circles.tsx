import { EmptyState } from '@/components/EmptyState';
import { PreviewLink } from '@/components/PreviewLink';
import { Page } from '@/components/Page';
import { SectionLabel } from '@/components/SectionLabel';
import { TabHeader } from '@/components/TabHeader';
import { TabIcon } from '@/components/TabIcons';
import { colors } from '@tero/ui';
import { useLocale } from '@/lib/locale';

/** The Circles you belong to. Each opens as one calm conversation with topic pills. */
export default function Circles() {
  const { t } = useLocale();
  return (
    <Page tabs>
      <TabHeader title={t('tabs.circles')} />
      <SectionLabel>{t('circles.yours')}</SectionLabel>
      <EmptyState
        icon={<TabIcon name="circles" color={colors.clayText} />}
        title={t('circles.empty.title')}
        body={t('circles.empty.body')}
      />
      <PreviewLink label={t('preview.circle')} href="/circle" />
    </Page>
  );
}
