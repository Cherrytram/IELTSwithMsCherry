# Upgrade 12 — Starter anime assets and first-login onboarding

## Included
- `/welcome` guided flow: choose boy/girl, preview character, confirm; choice saved via authenticated `/api/fashion` gender action.
- 28 bundled transparent 300×430 PNG files (2 base body images + 13 aligned item layers per gender).
- `supabase/starter_characters_upgrade_12.sql` inserts 26 shop products with static local PNG asset paths.
- Existing Fashion Studio, purchases, wardrobe, and previous upgrades retained.

## Setup
1. Apply all prior SQL migrations in order, then run `supabase/starter_characters_upgrade_12.sql`.
2. Deploy `public/starter-fashion/` with the Next.js app; local paths `/starter-fashion/*.png` must be accessible.
3. A student can visit `/welcome` to select the starter character; `/fashion` is the wardrobe/shop.

## Limits
- The bundled illustrations are simple 2D starter placeholders, not polished professional anime art.
- Existing SVG avatar remains the fallback/base; layered starter item images are positioned at the same 300×430 canvas.
- The current landing page does not automatically redirect all first-time student logins to `/welcome`; users can open it directly.
- Starter items are listed in Shop; zero-cost items are not automatically assigned to inventory.
- Full Next.js build, Supabase migration, and end-to-end testing require environment configuration.
