import type { NotificationEvent } from "./notification-events";
import { sortNotificationEvents } from "./notification-event-ordering";

/**
 * Merge canonical persisted events with safe live projections for presentation.
 * Persisted canonical records win on duplicate event_key so a projection can
 * never visually double-count an event that has already been recorded.
 */
export function mergeNotificationEventsForPresentation(input: {
  persisted: readonly NotificationEvent[];
  projected?: readonly NotificationEvent[];
}): NotificationEvent[] {
  const byKey = new Map<string, NotificationEvent>();

  for (const event of input.projected ?? []) {
    byKey.set(event.event_key, event);
  }

  for (const event of input.persisted) {
    byKey.set(event.event_key, event);
  }

  return sortNotificationEvents([...byKey.values()]);
}

export function topCeoNotificationEvents(
  events: readonly NotificationEvent[],
  limit = 5,
): NotificationEvent[] {
  const safeLimit = Math.max(0, Math.floor(limit));
  return sortNotificationEvents([...events]).slice(0, safeLimit);
}
