import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Game from "./idle/Game";
import { platformConfig } from "./platform/config";
import { platformBridge } from "./platform/bridge";
import { installGameInputGuard } from "./platform/inputGuard";
import { gameServices } from "./platform/services";


async function startGame() {
  const removeInputGuard = installGameInputGuard();
  window.addEventListener("pagehide", removeInputGuard, { once: true });
  await platformBridge.initialize();
  void gameServices.analytics.track("session_started", {
    device_type: window.matchMedia("(pointer: coarse)").matches ? "mobile" : "desktop",
    screen_width: window.innerWidth,
    screen_height: window.innerHeight,
    platform_mode: platformConfig.id,
  });

  const root = document.getElementById("root");
  if (!root) throw new Error("Game root element was not found");

  createRoot(root).render(
    <StrictMode>
      <Game />
    </StrictMode>,
  );
}

void startGame();
