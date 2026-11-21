export function nextFocusIndex(current: number, count: number, direction: number) {
  if (count <= 0) return -1;
  if (current < 0) return direction < 0 ? count - 1 : 0;
  return (current + direction + count) % count;
}
export function focusPlayerButton(direction = 1) {
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>(".tv-player button:not(:disabled)"))
    .filter(button => button.getClientRects().length > 0);
  buttons[nextFocusIndex(buttons.indexOf(document.activeElement as HTMLButtonElement), buttons.length, direction)]?.focus();
}
export async function subscribePlayerBack(closeOverlay: () => boolean) {
  const { Capacitor } = await import('@capacitor/core');
  if (!Capacitor.isNativePlatform()) return () => {};
  const { App } = await import('@capacitor/app');
  const listener = await App.addListener('backButton', () => {
    if (!closeOverlay()) void App.exitApp();
  });
  return () => { void listener.remove(); };
}