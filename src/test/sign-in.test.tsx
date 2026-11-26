import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(async () => {}),
  cancelQueries: vi.fn(async () => {}),
  setQueryData: vi.fn(),
  signIn: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: { component: () => React.ReactNode }) => ({
    options,
    useSearch: () => ({}),
  }),
  useNavigate: () => mocks.navigate,
}));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mocks,
  useQuery: () => ({ data: undefined }),
}));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { auth: { signInWithPassword: mocks.signIn } } }));
vi.mock('@/integrations/lovable', () => ({ lovable: { auth: {} } }));
vi.mock('@/components/theme-toggle', () => ({ ThemeToggle: () => null }));
vi.mock('sonner', () => ({ toast: { error: mocks.toastError } }));
// Regression: sign-in must not depend on the export absent in the stale module.
vi.mock('@/lib/verified-user', () => ({}));

import { Route } from '@/routes/auth';

afterEach(() => { cleanup(); vi.resetAllMocks(); });

async function submitLogin() {
  const Component = Route.options.component;
  if (!Component) throw new Error('Login component missing');
  render(<Component />);
  fireEvent.click(screen.getByRole('button', { name: /^Se connecter$/ }));
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'login-test@example.com' } });
  fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'test-only-password' } });
  const form = screen.getByLabelText('E-mail').closest('form');
  if (!form) throw new Error('Login form missing');
  await act(async () => { fireEvent.submit(form); });
}

describe('Successful sign-in navigation', () => {
  it('primes the verified identity inline and navigates without the stale helper export', async () => {
    const user = { id: 'signed-in-owner' };
    mocks.signIn.mockResolvedValue({ data: { user }, error: null });
    await submitLogin();
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: '/' }));
    expect(mocks.setQueryData).toHaveBeenCalledWith(['auth', 'verified-user'], user);
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it('still navigates when cache priming fails', async () => {
    mocks.signIn.mockResolvedValue({ data: { user: { id: 'signed-in-owner' } }, error: null });
    mocks.setQueryData.mockImplementation(() => { throw new Error('cache unavailable'); });
    await submitLogin();
    await waitFor(() => expect(mocks.navigate).toHaveBeenCalledWith({ to: '/' }));
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it('does not navigate or prime identity when sign-in is rejected', async () => {
    mocks.signIn.mockResolvedValue({ data: { user: null }, error: new Error('Connexion refusée') });
    await submitLogin();
    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith('Connexion refusée'));
    expect(mocks.navigate).not.toHaveBeenCalled();
    expect(mocks.setQueryData).not.toHaveBeenCalled();
  });
});