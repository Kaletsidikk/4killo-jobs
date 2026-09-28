import { useEffect } from "react";
import { init, miniApp, viewport } from "@tma.js/sdk";

export function useTelegram() {
  useEffect(() => {
    const initializeTelegram = async () => {
      try {
        await init();

        miniApp.ready();

        if (viewport.expand.isAvailable()) {
          viewport.expand();
        }
      } catch (error) {
        console.log("Telegram WebApp is not available:", error);
      }
    };

    initializeTelegram();
  }, []);
}