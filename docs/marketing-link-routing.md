# Social destination routing

The Social Media Assistant uses approved destination URLs stored in the existing `app_settings` table with the `marketing.link.` prefix.

Current keys include `default`, `cossa_store`, `nexdocs`, `growth`, `cossa_nexus_holdings`, `cossa_tech`, `cossa_nexus_construction`, and `cossa_facility_services`.

The AI chooses only a destination key. The application resolves the actual URL from `app_settings`, so the model cannot invent or substitute business links. The copied public post includes the CTA, approved destination URL and hashtags. Saved drafts retain the CTA plus destination URL so they can also be copied in one action.
