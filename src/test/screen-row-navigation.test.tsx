import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

const navigate = vi.fn();
const mocks = vi.hoisted(() => ({ deleteScreen: vi.fn(), refresh: vi.fn() }));

const SCREENS = [
  { id: "a1", name: "TV SALLE", status: "online", groupId: null, playlistId: null, location: "" },
  { id: "b2", name: "TV TERRASSE", status: "offline", groupId: "g1", playlistId: "p1", location: "" },
];
const GROUPS = [{ id: "g1", name: "Vitrines", location: "" }];
const PLAYLISTS = [{ id: "p1", name: "Promos" }];

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({
    ...options,
    useSearch: () => ({}),
    useParams: () => ({}),
  }),
  Link: ({ to, params, className, children }: { to: string; params?: Record<string, string>; className?: string; children: ReactNode }) => (
    <a
      href={params ? Object.entries(params).reduce((url, [key, value]) => url.replace(`$${key}`, value), to) : to}
      className={className}
      onClick={(event) => event.preventDefault()}
    >
      {children}
    </a>
  ),
  useNavigate: () => navigate,
}));

vi.mock("@/lib/store", () => ({
  useStore: () => ({ screens: SCREENS, groups: GROUPS, playlists: PLAYLISTS, refresh: mocks.refresh }),
  useBillingStore: () => ({ data: undefined }),
  isValidPairingCode: () => false,
  addScreen: vi.fn(),
  deleteScreen: mocks.deleteScreen,
}));

vi.mock("@/components/app-shell", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
  EmptyState: () => null,
  StatusBadge: ({ status }: { status: string }) => <span>{status}</span>,
}));

vi.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }));
vi.mock("@/components/screen-health-chart", () => ({ ScreenHealthChart: () => null }));
vi.mock("@/components/pairing-scanner", () => ({ PairingScanner: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { Screens } from "@/routes/_authenticated/screens";

afterEach(() => {
  cleanup();
  navigate.mockClear();
  mocks.deleteScreen.mockReset();
  mocks.refresh.mockClear();
});

const rowOf = (name: string) => {
  const cell = screen.getByText(name);
  const row = cell.closest("tr");
  if (!row) throw new Error(`missing table row for ${name}`);
  return row as HTMLElement;
};

it("opens the screen detail page when a row is clicked", () => {
  render(<Screens />);
  fireEvent.click(within(rowOf("TV TERRASSE")).getByText("Jamais"));
  expect(navigate).toHaveBeenCalledWith({ to: "/screens/$screenId", params: { screenId: "b2" } });
});

it("opens the detail page of the clicked row, not another one", () => {
  render(<Screens />);
  fireEvent.click(within(rowOf("TV SALLE")).getByText("Jamais"));
  expect(navigate).toHaveBeenCalledWith({ to: "/screens/$screenId", params: { screenId: "a1" } });
});

it("does not navigate when the row's own link or delete button is clicked", () => {
  render(<Screens />);
  const row = rowOf("TV SALLE");
  fireEvent.click(within(row).getByText("TV SALLE"));
  fireEvent.click(within(row).getByRole("button", { name: "Supprimer" }));
  expect(navigate).not.toHaveBeenCalled();
});

it("asks for confirmation before deleting the TV of the clicked row", async () => {
  mocks.deleteScreen.mockResolvedValue(undefined);
  render(<Screens />);
  fireEvent.click(within(rowOf("TV TERRASSE")).getByRole("button", { name: "Supprimer" }));
  expect(mocks.deleteScreen).not.toHaveBeenCalled();
  expect(screen.getByText("Supprimer cette TV ?")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
  expect(mocks.deleteScreen).not.toHaveBeenCalled();

  fireEvent.click(within(rowOf("TV TERRASSE")).getByRole("button", { name: "Supprimer" }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Supprimer" }));
  await waitFor(() => expect(mocks.deleteScreen).toHaveBeenCalledWith("b2"));
  expect(mocks.refresh).toHaveBeenCalled();
});
