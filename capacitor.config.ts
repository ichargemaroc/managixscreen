import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.screenflow.player",
  appName: "ScreenFlow TV",
  webDir: "dist-player",
  android: { allowMixedContent: false },
};
export default config;