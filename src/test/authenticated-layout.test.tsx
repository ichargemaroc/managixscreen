import { cleanup, render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: { component: () => ReactNode }) => ({ options }),
  Outlet: () => <main />,
  redirect: vi.fn(),
}));
vi.mock('@/lib/verified-user', () => ({ verifiedUser: vi.fn() }));
// Reproduce a previously loaded store: established exports exist, StoreContent does not.
vi.mock('@/lib/store', () => ({
  StoreProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useStore: () => ({ loading: false, loadError: false, retry: vi.fn() }),
  StoreContent: undefined,
}));
vi.mock('@/components/app-shell', () => ({ AppShell: ({ children }: { children: ReactNode }) => <>{children}</> }));
vi.mock('@/components/realtime-sync', () => ({ RealtimeSync: () => null }));

import { Route } from '@/routes/_authenticated/route';

afterEach(cleanup);

it('renders the authenticated layout with a store loaded before the new loading component existed', () => {
  const Layout = Route.options.component;
  if (!Layout) throw new Error('Authenticated layout missing');
  expect(() => render(<Layout />)).not.toThrow();
});