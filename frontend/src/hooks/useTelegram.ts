import { useEffect, useState } from "react";
import {
  init,
  miniApp,
  viewport,
  retrieveLaunchParams,
} from "@tma.js/sdk";
import { authenticateTelegram } from "../services/auth";

export function useTelegram() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeTelegram = async () => {
      try {
        // Initialize Telegram SDK
        await init();

        setIsTelegram(true);

        // Tell Telegram that the Mini App is ready
        miniApp.ready();

        // Expand the Mini App to available height
        if (viewport.expand.isAvailable()) {
          viewport.expand();
        }

        // Get Telegram launch parameters from @tma.js/sdk or window.Telegram.WebApp fallback
        let initData: string | undefined;

        try {
          const launchParams = retrieveLaunchParams();
          initData = launchParams.initDataRaw;
        } catch {
          // Fallback to native window.Telegram.WebApp if retrieveLaunchParams throws
          const tg = (window as any).Telegram?.WebApp;
          if (tg) {
            tg.ready?.();
            tg.expand?.();
            initData = tg.initData;
          }
        }

        if (!initData) {
          const tg = (window as any).Telegram?.WebApp;
          if (tg?.initData) {
            initData = tg.initData;
          }
        }

        if (!initData) {
          console.log("Telegram initData is not available.");
          setLoading(false);
          return;
        }

        // Authenticate with our backend
        await authenticateTelegram(initData);

        setIsAuthenticated(true);

        console.log("Telegram authentication successful");
      } catch (error) {
        console.log(
          "Telegram environment not detected. Running in browser mode."
        );
      } finally {
        setLoading(false);
      }
    };

    initializeTelegram();
  }, []);

  return {
    isAuthenticated,
    isTelegram,
    loading,
  };
}