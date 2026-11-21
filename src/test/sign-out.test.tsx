import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const calls: string[] = [];
  return {
    calls,
    navigate: vi.fn(async () => { calls.push('navigate'); }),
    cancelQueries: vi.fn(async () => { calls.push('cancelQueries'); }),
    clear: vi.fn(() => { calls.push('clear'); }),
    authSignOut: vi.fn(async () => { calls.push('signOut'); }),
  };
});

vi.mock('@tanstack/react-router', () => ({ useNavigate: () => mocks.navigate }));
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ cancelQueries: mocks.cancelQueries, clear: mocks.clear }) }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { signOut: mocks.authSignOut } } }));

import { SignOutButton } from '@/components/sign-out-button';

afterEach(() => { cleanup(); mocks.calls.length = 0; vi.clearAllMocks(); });

it('signs out in the safe order and leaves the protected area', async () => {
  render(<SignOutButton />);
  const button = screen.getByRole('button', { name: 'Se déconnecter' });
  await act(async () => { fireEvent.click(button); });
  expect(mocks.calls).toEqual(['cancelQueries', 'clear', 'signOut', 'navigate']);
  expect(mocks.navigate).toHaveBeenCalledWith({ to: '/auth', replace: true });
});
