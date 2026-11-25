import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, expect, it, vi } from 'vitest';

const SCREENS = [
  { id: 'a1', name: 'TV TERASSE', status: 'online' },
  { id: 'b2', name: 'TV SALLE', status: 'offline' },
];
const GROUPS = [{ id: 'g1', name: 'Vitrines' }];

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, params, search, children }: { to: string; params?: { screenId?: string }; search?: Record<string, string>; children: ReactNode }) => {
    const href = params?.screenId
      ? to.replace('$screenId', params.screenId)
      : search && Object.keys(search).length
        ? `${to}?${new URLSearchParams(search).toString()}`
        : to;
    return <a href={href}>{children}</a>;
  },
  useRouterState: (opts: { select: (state: { location: { pathname: string; search: Record<string, string> } }) => unknown }) =>
    opts.select({ location: { pathname: '/screens', search: {} } }),
}));

vi.mock('@/components/ui/sidebar', () => {
  const pass = ({ children }: { children: ReactNode }) => <>{children}</>;
  return {
    Sidebar: pass,
    SidebarContent: pass,
    SidebarFooter: pass,
    SidebarGroup: pass,
    SidebarGroupContent: pass,
    SidebarHeader: pass,
    SidebarInset: pass,
    SidebarMenu: ({ children }: { children: ReactNode }) => <ul>{children}</ul>,
    SidebarMenuItem: ({ children }: { children: ReactNode }) => <li>{children}</li>,
    SidebarMenuButton: ({ children }: { children: ReactNode }) => <button type="button">{children}</button>,
    SidebarProvider: pass,
    SidebarTrigger: () => null,
    useSidebar: () => ({ setOpenMobile: vi.fn() }),
  };
});

vi.mock('@/lib/store', () => ({
  usePlatformAdmin: () => ({ data: false }),
  useStore: () => ({ screens: SCREENS, groups: GROUPS }),
}));

vi.mock('@/components/theme-toggle', () => ({ ThemeToggle: () => null }));
vi.mock('@/components/sign-out-button', () => ({ SignOutButton: () => null }));

import { NavLinks } from '@/components/app-shell';

afterEach(cleanup);

const renderMenu = () => render(<NavLinks currentUrl="/screens" path="/screens" onNavigate={vi.fn()} />);
const accordionHeader = () => screen.getByRole('button', { name: /liste des téléviseurs/i });
const groupsHeader = () => screen.getByRole('button', { name: /liste des groupes/i });
const tvRows = () => screen.queryAllByText(/TV (TERASSE|SALLE)/).filter((el) => el.closest('a'));
const groupRows = () => screen.queryAllByText('Vitrines').filter((el) => el.closest('a'));

it('keeps the screen list closed until the accordion is opened', () => {
  renderMenu();
  const header = accordionHeader();
  expect(header.getAttribute('aria-expanded')).toBe('false');
  expect(tvRows()).toHaveLength(0);

  fireEvent.click(header);
  expect(header.getAttribute('aria-expanded')).toBe('true');
  expect(tvRows()).toHaveLength(2);

  fireEvent.click(header);
  expect(header.getAttribute('aria-expanded')).toBe('false');
  expect(tvRows()).toHaveLength(0);
});

it('keeps the group list closed until the accordion is opened', () => {
  renderMenu();
  const header = groupsHeader();
  expect(header.getAttribute('aria-expanded')).toBe('false');
  expect(groupRows()).toHaveLength(0);

  fireEvent.click(header);
  expect(header.getAttribute('aria-expanded')).toBe('true');
  expect(groupRows()).toHaveLength(1);

  fireEvent.click(header);
  expect(header.getAttribute('aria-expanded')).toBe('false');
  expect(groupRows()).toHaveLength(0);
});

it('gives the group accordion the same card style as the screen accordion', () => {
  renderMenu();
  const tvCard = accordionHeader().closest('div');
  const groupCard = groupsHeader().closest('div');
  expect(groupCard?.className).toBe(tvCard?.className);
  expect(groupsHeader().className).toBe(accordionHeader().className);
});

it('lists every screen one by one once the accordion is open', () => {
  renderMenu();
  fireEvent.click(accordionHeader());
  for (const tv of SCREENS) {
    const row = screen.getAllByText(tv.name).find((el) => el.closest('a'));
    expect(row, `missing submenu row for ${tv.name}`).toBeTruthy();
    expect(row?.closest('a')?.getAttribute('href')).toBe(`/screens/${tv.id}`);
  }
});

it('lists every group as a clickable row that opens that group', () => {
  renderMenu();
  fireEvent.click(groupsHeader());
  const row = groupRows()[0];
  expect(row, 'missing submenu row for the group').toBeTruthy();
  expect(row?.closest('a')?.getAttribute('href')).toBe('/groups?g=g1');
});

it('keeps a plain link to the groups page inside the group accordion', () => {
  renderMenu();
  fireEvent.click(groupsHeader());
  const row = screen.getAllByText('Tous les groupes').find((el) => el.closest('a'));
  expect(row, 'missing link to the groups page').toBeTruthy();
  expect(row?.closest('a')?.getAttribute('href')).toBe('/groups');
});

it('puts "Ajouter une TV" first in the opened screen list', () => {
  renderMenu();
  fireEvent.click(accordionHeader());
  const rows = screen
    .getAllByText(/Ajouter une TV|TV (TERASSE|SALLE)/)
    .filter((el) => el.closest('a'));
  expect(rows).toHaveLength(3);
  expect(rows[0]?.textContent).toContain('Ajouter une TV');
  expect(rows[0]?.closest('a')?.getAttribute('href')).toBe('/screens?new=1');
});

it('puts the screen accordion where the Écrans card used to be, above Groupes', () => {
  renderMenu();
  const header = accordionHeader();
  const groupHeader = groupsHeader();
  // Groupes must come after the accordion header, i.e. the accordion took the first slot.
  expect(header.compareDocumentPosition(groupHeader) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  // The duplicated "Écrans" card is gone: only the menu row itself is named Écrans.
  expect(screen.getAllByText('Écrans')).toHaveLength(1);
});
