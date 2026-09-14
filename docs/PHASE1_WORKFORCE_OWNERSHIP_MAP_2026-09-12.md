# Cossa AI OS — Phase 1 Workforce Ownership Map

Date: 2026-09-12
Branch: `audit/phase1-safe-repair-20260912`

This is an audit map, not permission to create duplicate employees or reorganise production navigation yet.

## Rules

- One canonical employee may have multiple authorised entry points.
- Company workspaces should expose the employees and tools relevant to that company.
- Shared employees stay canonical and are referenced by the companies that use them.
- Do not create a new employee merely because a company workspace currently links only to `/ai/workforce`.
- Create a genuinely new employee only after the audit proves that no existing employee can safely own the responsibility.

## Executive / group shared

### AI CEO — `ai-ceo`

Ownership: Group / Executive Office

Current role: executive coordination, workforce synthesis, escalation and owner decision support.

Current condition: EXISTS / PARTIAL.

Important gap: owner-facing `/ai/ceo` is currently a SpecialistChat surface. Automatic timestamped executive briefs are not yet proven as a persistent background output.

## Growth / marketing shared workforce

Verified canonical employees already present:

- Website & SEO Monitor — `website-seo-monitor`
- Social Strategy Planner — `social-strategy-planner`
- Content Writer — `content-writer`
- Creative Media Producer — `creative-media-producer`
- Social Schedule Coordinator — `social-schedule-coordinator`
- Social Media Manager — `social-media-manager`
- Account Growth Analyst — `account-growth-analyst`
- Paid Media Specialist — `paid-media-specialist`

These are group/shared Growth employees and should be callable from relevant company workspaces without cloning them.

## Cossa Store

Verified Store-specific canonical employees:

- Store Operations Manager — `store-operations-manager`
- Product Intelligence Analyst — `product-intelligence-analyst`
- Supplier Sourcing Analyst — `supplier-sourcing-analyst`

Verified shared employees currently referenced from Store workforce views/workflows:

- Creative Media Producer
- Social Media Manager
- Account Growth Analyst
- Content Writer
- AI CEO

Store also references commercial/revenue employees where relevant, including Broker/Deal Intelligence.

Store navigation should eventually group Store-only capabilities beneath Cossa Store, including Product Manager, Digital Deliverables, Smart Intake, Inventory and other Store execution surfaces that pass the route/data audit.

## Cossa Tech

Verified Tech-specific canonical employees:

- Tech Solutions Specialist — `tech-solutions-specialist`
- Website Delivery Specialist — `website-delivery-specialist`

Verified shared employees currently referenced by Tech workflows:

- Content Writer
- Creative Media Producer
- Website & SEO Monitor
- AI CEO

## Revenue / procurement shared workforce

Verified canonical employees:

- Lead Hunter — `lead-hunter`
- Lead Intake Coordinator — `lead-intake-coordinator`
- Sales & Conversion Specialist — `sales-conversion-specialist`
- Customer Reactivation Analyst — `customer-reactivation-analyst`
- Broker / Deal Intelligence Analyst — `broker-deal-intelligence-analyst`
- Procurement Intelligence Analyst — `procurement-intelligence-analyst`

These are group-level revenue employees and can serve Construction, Facility Services, Tech, Store, NexDocs and Holdings according to service fit without duplication.

## Cossa Nexus Construction

Current workspace EXISTS and links to:

- Lead Hunter / Lead Finder
- CRM & Customers
- Quotations
- Tender Research
- Construction Documents
- Projects
- Construction Marketing
- SEO & Search
- Content Studio
- Sales Analytics
- Construction Workflows
- generic `/ai/workforce` as "Construction AI Team"

Audit finding: the workspace is company-organised, but it does not yet open a filtered Construction employee/team view. Tender Research also links generically to `/ai/workforce` rather than directly to Procurement Intelligence or an appropriate filtered workforce context.

Current ownership strategy before creating anything:

- customer/prospect acquisition -> Lead Hunter
- intake/dedup/routing -> Lead Intake Coordinator
- sales conversion/quotation preparation -> Sales & Conversion Specialist
- tender/RFQ screening -> Procurement Intelligence Analyst
- marketing -> shared Growth employees
- documents/projects -> existing operations/document capabilities
- executive escalation -> AI CEO

Construction-specific operational employee: NEEDS VERIFICATION. Do not create yet.

## Cossa Facility Services

Current workspace EXISTS and links to:

- Find Customers / Lead Finder
- CRM & Customers
- Quotations
- Service Projects
- Tasks
- Calendar
- Documents
- Facility Marketing
- SEO & Search
- Content Studio
- Sales Analytics
- Service Workflows
- Business Intelligence
- generic `/ai/workforce` as "Facility Services AI Team"

Audit finding: the workspace is company-organised, but it does not yet open a filtered Facility Services employee/team view.

Current ownership strategy before creating anything:

- customer/prospect acquisition -> Lead Hunter
- intake/dedup/routing -> Lead Intake Coordinator
- sales conversion/quotation preparation -> Sales & Conversion Specialist
- recurring-customer opportunity -> Customer Reactivation Analyst
- procurement/tender screening -> Procurement Intelligence Analyst where relevant
- marketing -> shared Growth employees
- operations/projects/tasks -> existing operations capabilities
- executive escalation -> AI CEO

Facility-specific operational employee: NEEDS VERIFICATION. Do not create yet.

## NexDocs

NexDocs company workspace exists in the route tree. Dedicated employee ownership still requires detailed audit before classification.

Likely existing shared owners to verify before creating any NexDocs-specific employee:

- Content Writer
- Sales & Conversion Specialist
- Lead Hunter
- AI CEO
- Document Assistant specialist/workspace

Do not create a NexDocs AI team until the existing specialist/workforce mappings are fully checked.

## Specialist routes vs workforce employees

The repository intentionally distinguishes owner-facing specialist workspaces from executable workforce employees.

Examples of specialist routes already present include AI CEO, Finance, HR, CRM Specialist, Document Assistant, Operations Manager, Project Manager, Sales Assistant, Consultant, Coach, Automation and Cossa AI.

A specialist route must not be converted into a second duplicate employee automatically. First determine whether it should:

1. remain advisory only;
2. map to an existing canonical employee;
3. create tracked missions for an existing employee; or
4. become a genuinely new canonical employee only if the role is truly missing.

## Confirmed navigation issue

Construction and Facility Services already have company workspaces, but their "AI Team" links currently point to the generic `/ai/workforce` route without a company/department filter.

Safe future fix after the full audit:

- retain one `/ai/workforce` system;
- pass company/department context into the workforce route;
- show only relevant canonical employees for that company while keeping shared employees accessible;
- make every employee card clickable into the reusable Agent Workspace.

## Next ownership checks

- NexDocs employee/specialist mapping
- Store commercial/revenue employee crossover
- Finance/HR/Operations specialist-to-workforce mapping
- whether Construction has any hidden canonical operational employee
- whether Facility Services has any hidden canonical operational employee
- whether business-unit IDs are populated consistently in live workforce records
- whether specialist routes already create missions or only chat/draft
- whether department/company filters can be added to `/ai/workforce` without duplicating records
