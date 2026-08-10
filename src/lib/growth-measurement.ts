export const GROWTH_MEASUREMENT_PREFERENCE_KEY = "cossa-growth-measurement-preference";
export const GROWTH_MEASUREMENT_CHANGE_EVENT = "cossa-growth-measurement-preference-changed";
export const GROWTH_COOKIE_PREFERENCES_EVENT = "cossa-growth-open-cookie-preferences";

export type GrowthMeasurementPreference = "essential" | "measurement";

type MeasurementPayload = Record<string, string | number | boolean | null | undefined>;

type GrowthWindow = Window & {
  dataLayer?: Array<Record<string, unknown>>;
};

export function getGrowthMeasurementPreference(): GrowthMeasurementPreference | null {
  if (typeof window === "undefined") {
    return null;
  }

  const preference = window.localStorage.getItem(GROWTH_MEASUREMENT_PREFERENCE_KEY);
  return preference === "essential" || preference === "measurement" ? preference : null;
}

export function hasGrowthMeasurementConsent(): boolean {
  return getGrowthMeasurementPreference() === "measurement";
}

export function saveGrowthMeasurementPreference(preference: GrowthMeasurementPreference): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(GROWTH_MEASUREMENT_PREFERENCE_KEY, preference);
  window.dispatchEvent(new Event(GROWTH_MEASUREMENT_CHANGE_EVENT));
}

export function openGrowthCookiePreferences(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(GROWTH_COOKIE_PREFERENCES_EVENT));
}

export function trackGrowthMeasurementEvent(event: string, payload: MeasurementPayload = {}): void {
  if (typeof window === "undefined" || !hasGrowthMeasurementConsent()) {
    return;
  }

  const typedWindow = window as GrowthWindow;
  const dataLayer = (typedWindow.dataLayer ??= []);
  dataLayer.push({ event, ...payload });
}
