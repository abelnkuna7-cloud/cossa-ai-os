# Implementation gate

This branch is additive and intentionally does not remove existing Product Manager or Workforce behaviour.

Before production merge:
1. Run the existing repository test/build pipeline plus digital-product intelligence tests.
2. Apply the additive database migration through the existing safe Supabase migration pipeline.
3. Wire subtype/profile controls into the existing Product Manager UI without replacing current fields.
4. Compose the digital capability additions into the existing Product Intelligence Analyst and Store Operations Manager runtime definitions.
5. Verify an eBook/storybook, course and software draft.
6. Verify persisted and unsaved price diagnostics.
7. Keep publication owner-controlled.

Do not deploy a partial UI integration merely because helper modules compile.
