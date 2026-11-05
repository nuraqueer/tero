import type { PropsWithChildren } from 'react';
import { ContextMenuHost, DialogHost, TooltipHost } from '@passui/react';
import { PlatformProvider, ThemeProvider } from '@passui/react/appearance';
import { Toaster } from '@passui/react/toaster';

export function PassuiProvider({ children }: PropsWithChildren) {
  return (
    <PlatformProvider>
      <ThemeProvider
        attribute={['class', 'data-theme']}
        defaultTheme="system"
        enableSystem
        enableColorScheme
      >
        {children}
        <Toaster />
        <ContextMenuHost />
        <DialogHost />
        <TooltipHost />
      </ThemeProvider>
    </PlatformProvider>
  );
}
