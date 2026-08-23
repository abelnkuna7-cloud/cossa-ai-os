const ACTIVE_ORGANISATION_STORAGE_KEY = "cossa.growth.active-organisation.v1";

export const COSSA_INTERNAL_ORGANISATION_ID = "00000000-0000-4000-8000-000000000001";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isOrganisationId(value: string | null | undefined): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

/**
 * The selected workspace is a browser preference only. Membership RLS and
 * server-side checks remain the authority for every data request.
 */
export function getActiveOrganisationId(): string {
  if (typeof window !== "undefined") {
    const selected = window.localStorage.getItem(ACTIVE_ORGANISATION_STORAGE_KEY);
    if (isOrganisationId(selected)) return selected;
  }

  const configured = import.meta.env.VITE_COSSA_ORGANISATION_ID?.trim();
  return isOrganisationId(configured) ? configured : COSSA_INTERNAL_ORGANISATION_ID;
}

export function setActiveOrganisationId(organisationId: string): void {
  if (!isOrganisationId(organisationId)) {
    throw new Error("The selected workspace is invalid.");
  }

  if (typeof window !== "undefined") {
    window.localStorage.setItem(ACTIVE_ORGANISATION_STORAGE_KEY, organisationId);
  }
}
