import { useCallback, useEffect, useState } from "react";
import type { AppSettings } from "../../../types";
import { getAppSettings, runCodexDoctor, updateAppSettings } from "../../../services/tauri";
import { clampUiScale, UI_SCALE_DEFAULT } from "../../../utils/uiScale";

const defaultSettings: AppSettings = {
  codexBin: null,
  defaultAccessMode: "current",
  uiScale: UI_SCALE_DEFAULT,
  notificationSoundsEnabled: true,
  experimentalSteerEnabled: false,
  dictationEnabled: false,
  dictationModelId: "base",
  dictationPreferredLanguage: null,
  dictationHoldKey: "alt",

  runnerId: "unknown",
  cloudProvider: "nats",
  natsUrl:
    "nats://cd742330aa503008b7017f247b1793478ffaecc8e9aec7b1134679327a62ae64@server1.nats.ilass.com:4222",
  cloudKitContainerId: "iCloud.com.ilass.codexmonitor",

  telegramEnabled: false,
  telegramBotToken: null,
  telegramAllowedUserIds: null,
  telegramDefaultChatId: null,
};

function normalizeAppSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    uiScale: clampUiScale(settings.uiScale),
    natsUrl: settings.natsUrl?.trim() ? settings.natsUrl.trim() : null,
    cloudKitContainerId: settings.cloudKitContainerId?.trim()
      ? settings.cloudKitContainerId.trim()
      : null,
  };
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const response = await getAppSettings();
        if (active) {
          setSettings(
            normalizeAppSettings({
              ...defaultSettings,
              ...response,
            }),
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const saveSettings = useCallback(async (next: AppSettings) => {
    const normalized = normalizeAppSettings(next);
    const saved = await updateAppSettings(normalized);
    setSettings(
      normalizeAppSettings({
        ...defaultSettings,
        ...saved,
      }),
    );
    return saved;
  }, []);

  const doctor = useCallback(async (codexBin: string | null) => {
    return runCodexDoctor(codexBin);
  }, []);

  return {
    settings,
    setSettings,
    saveSettings,
    doctor,
    isLoading,
  };
}
