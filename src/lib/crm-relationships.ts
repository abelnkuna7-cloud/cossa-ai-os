import { supabase } from "@/integrations/supabase/client";
import { COSSA_ORGANISATION_ID } from "@/lib/workforce-data";

export type CrmCompany = {
  id: string;
  trading_name: string;
  legal_name: string | null;
  domain: string | null;
  website: string | null;
  general_email: string | null;
  general_phone: string | null;
  city: string | null;
  country: string | null;
  verification_status: string;
  relationship_health: string;
  updated_at: string;
};

export type CrmContact = {
  id: string;
  company_id: string | null;
  full_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  preferred_channel: string | null;
  is_primary: boolean;
};

export type CrmRelationship = {
  id: string;
  company_id: string;
  contact_id: string | null;
  business_unit_id: string | null;
  relationship_type_key: string;
  status_key: string;
  priority: string;
  next_action: string | null;
  next_action_at: string | null;
  last_contact_at: string | null;
};

export type CrmOpportunity = {
  id: string;
  company_id: string | null;
  contact_id: string | null;
  relationship_id: string | null;
  business_unit_id: string | null;
  organization_name: string;
  opportunity_type: string;
  stage_key: string | null;
  status: string;
  estimated_value: number | null;
  probability: number;
  priority: string;
  next_action: string | null;
  next_action_at: string | null;
  updated_at: string;
};

export type CrmCommunicationSummary = {
  id: string;
  company_id: string | null;
  contact_id: string | null;
  relationship_id: string | null;
  opportunity_id: string | null;
  subject: string | null;
  summary: string | null;
  channel: string;
  direction: string;
  status: string;
  requires_action: boolean;
  occurred_at: string;
  next_review_at: string | null;
};

export type CrmFollowUp = {
  id: string;
  company_id: string | null;
  contact_id: string | null;
  relationship_id: string | null;
  opportunity_id: string | null;
  subject: string;
  channel: string | null;
  due_at: string;
  status: string;
  priority: string;
  notes: string | null;
};

export type CrmDueDiligence = {
  id: string;
  company_id: string;
  relationship_id: string | null;
  check_type: string;
  status: string;
  risk_level: string;
  evidence_summary: string | null;
  review_due_at: string | null;
};

export type BusinessUnitSummary = { id: string; name: string };

export type RelationshipWorkspace = {
  companies: CrmCompany[];
  contacts: CrmContact[];
  relationships: CrmRelationship[];
  opportunities: CrmOpportunity[];
  communications: CrmCommunicationSummary[];
  followUps: CrmFollowUp[];
  dueDiligence: CrmDueDiligence[];
  businessUnits: BusinessUnitSummary[];
};

const db = supabase as unknown as {
  // Generated types do not yet include the additive CRM relationship tables.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  from: (table: string) => any;
};

async function rows<T>(table: string, select: string, orderBy = "updated_at"): Promise<T[]> {
  const { data, error } = await db
    .from(table)
    .select(select)
    .eq("organisation_id", COSSA_ORGANISATION_ID)
    .order(orderBy, { ascending: false });
  if (error) throw new Error(`Unable to load ${table}: ${error.message}`);
  return (data ?? []) as T[];
}

export async function loadRelationshipWorkspace(): Promise<RelationshipWorkspace> {
  const [
    companies,
    contacts,
    relationships,
    opportunities,
    communications,
    followUps,
    dueDiligence,
    businessUnits,
  ] = await Promise.all([
    rows<CrmCompany>(
      "crm_companies",
      "id,trading_name,legal_name,domain,website,general_email,general_phone,city,country,verification_status,relationship_health,updated_at",
    ),
    rows<CrmContact>(
      "crm_contacts",
      "id,company_id,full_name,job_title,email,phone,whatsapp,preferred_channel,is_primary",
    ),
    rows<CrmRelationship>(
      "crm_relationships",
      "id,company_id,contact_id,business_unit_id,relationship_type_key,status_key,priority,next_action,next_action_at,last_contact_at",
    ),
    rows<CrmOpportunity>(
      "opportunities",
      "id,company_id,contact_id,relationship_id,business_unit_id,organization_name,opportunity_type,stage_key,status,estimated_value,probability,priority,next_action,next_action_at,updated_at",
    ),
    rows<CrmCommunicationSummary>(
      "crm_communications",
      "id,company_id,contact_id,relationship_id,opportunity_id,subject,summary,channel,direction,status,requires_action,occurred_at,next_review_at",
      "occurred_at",
    ),
    rows<CrmFollowUp>(
      "sales_follow_ups",
      "id,company_id,contact_id,relationship_id,opportunity_id,subject,channel,due_at,status,priority,notes",
      "due_at",
    ),
    rows<CrmDueDiligence>(
      "crm_due_diligence",
      "id,company_id,relationship_id,check_type,status,risk_level,evidence_summary,review_due_at",
      "created_at",
    ),
    rows<BusinessUnitSummary>("business_units", "id,name", "name"),
  ]);

  return {
    companies,
    contacts,
    relationships,
    opportunities,
    communications,
    followUps,
    dueDiligence,
    businessUnits,
  };
}
