# Editable social marketing links

Social Media Assistant destination URLs are configuration, not source-code constants. They are stored in `app_settings` with keys prefixed by `marketing.link.`.

This keeps business destinations changeable without editing the social-generation logic. The assistant selects a destination key; the application resolves the approved URL from configuration.
