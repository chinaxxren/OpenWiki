import { useEffect } from "react";
import { useSettingsStore } from "./stores/settingsStore";

export function useAppBootstrap(): void {
  const loadFromDB = useSettingsStore((s) => s.loadFromDB);

  useEffect(() => {
    void loadFromDB();
  }, [loadFromDB]);
}
