import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useState, type ReactNode } from "react";
import { TvGroupSelect } from "@/components/tv-group-select";

const mocks = vi.hoisted(() => ({ addGroup: vi.fn(), refresh: vi.fn() }));
vi.mock("@/lib/store", () => ({ addGroup: mocks.addGroup, useStore: () => ({ groups: [{ id: "existing", name: "Salle" }], refresh: mocks.refresh }) }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ children, value, onValueChange }: { children: ReactNode; value: string; onValueChange: (value: string) => void }) => <select aria-label="group" value={value} onChange={(event) => onValueChange(event.target.value)}>{children}</select>,
  SelectContent: ({ children }: { children: ReactNode }) => <>{children}</>,
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) => <option value={value}>{children}</option>,
  SelectTrigger: () => null,
  SelectValue: () => null,
}));
const onCreatingChange = vi.fn();
function Picker() {
  const [value, setValue] = useState<string | null>("existing");
  return <TvGroupSelect value={value} onChange={setValue} onCreatingChange={onCreatingChange} />;
}
beforeEach(() => { vi.clearAllMocks(); mocks.addGroup.mockResolvedValue({ id: "saved-group", name: "Terrasse" }); });
afterEach(cleanup);

it("selects the saved group's identity immediately, before shared data refresh", async () => {
  render(<Picker />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "__create_group" } });
  fireEvent.change(screen.getByLabelText("Nom du nouveau groupe"), { target: { value: " Terrasse " } });
  fireEvent.change(screen.getByLabelText("Lieu du groupe (facultatif)"), { target: { value: " Rabat " } });
  fireEvent.click(screen.getByRole("button", { name: "Créer et sélectionner" }));
  await waitFor(() => expect(screen.getByRole("combobox")).toHaveValue("saved-group"));
  expect(mocks.addGroup).toHaveBeenCalledWith("Terrasse", "Rabat");
  expect(mocks.refresh).toHaveBeenCalledOnce();
  expect(onCreatingChange).toHaveBeenLastCalledWith(false);
});

it("keeps the previous selection and does not refresh on failed creation", async () => {
  mocks.addGroup.mockRejectedValue(new Error("failure"));
  render(<Picker />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "__create_group" } });
  fireEvent.change(screen.getByLabelText("Nom du nouveau groupe"), { target: { value: "Terrasse" } });
  fireEvent.click(screen.getByRole("button", { name: "Créer et sélectionner" }));
  await screen.findByRole("alert");
  expect(screen.getByRole("combobox")).toHaveValue("existing");
  expect(mocks.refresh).not.toHaveBeenCalled();
});

it("cancels creation without writing or changing the selection", () => {
  render(<Picker />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "__create_group" } });
  fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
  expect(mocks.addGroup).not.toHaveBeenCalled();
  expect(screen.getByRole("combobox")).toHaveValue("existing");
  expect(onCreatingChange).toHaveBeenLastCalledWith(false);
});

it("opens creation from the dropdown without assigning the action as a group", () => {
  render(<Picker />);
  fireEvent.change(screen.getByRole("combobox"), { target: { value: "__create_group" } });
  expect(screen.getByRole("combobox")).toHaveValue("existing");
  expect(onCreatingChange).toHaveBeenLastCalledWith(true);
  expect(mocks.addGroup).not.toHaveBeenCalled();
});