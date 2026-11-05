import { createRootRoute, HeadContent, Outlet, Scripts } from '@tanstack/react-router';
import { ComposeViewport } from '@passui/tanstack/document';
import { PlatformScript } from '@passui/react/appearance';
import { PassuiProvider } from '@/components/passui-provider';
import styles from '@/styles.css?url';

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Tero' },
    ],
    links: [{ rel: 'stylesheet', href: styles }],
  }),
  shellComponent: RouteComponent,
});

function RouteComponent() {
  return (
    <ComposeViewport>
      <head>
        <PlatformScript />
        <HeadContent />
      </head>
      <ComposeViewport.Window after={<Scripts />}>
        <PassuiProvider>
          <Outlet />
        </PassuiProvider>
      </ComposeViewport.Window>
    </ComposeViewport>
  );
}
