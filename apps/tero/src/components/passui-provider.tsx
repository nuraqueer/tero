import { useState, type PropsWithChildren } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ContextMenuHost, DialogHost, TooltipHost } from '@passui/react';
import { PlatformProvider, ThemeProvider } from '@passui/react/appearance';
import { Toaster } from '@passui/react/toaster';

export function PassuiProvider({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  );
}
