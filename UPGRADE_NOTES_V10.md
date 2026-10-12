# Upgrade 10 — Fashion Studio and Shop

## Install
1. Use this ZIP as the latest complete source (includes upgrades 01–09).
2. Run `supabase/fashion_upgrade_10.sql` in Supabase SQL Editor AFTER the existing schema and upgrade migrations.
3. Deploy to a staging environment with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` set securely.
4. Sign in as a student and open `/fashion`.

## Included
- Boy/girl character selection and SVG full-body preview.
- Shop and Studio tabs, item categories, multi-item previews, cancel, purchase confirmation, coin affordability and ownership checks.
- Purchases through existing `buy_shop_item` atomic Supabase RPC.
- Wear owned items, save unlimited outfits, duplicate protection, preview/wear/delete saved outfits.
- 16 additional gender-specific catalog entries and the existing 12 unisex entries; mobile-responsive layout.
- Existing character SVG is reused; no third-party anime assets are bundled.

## Limitations and next steps
- Character and garments remain SVG-based; layered uploaded PNG/WebP rendering and teacher asset-management UI are not yet implemented.
- The additional items use emoji catalog thumbnails; only the legacy SVG garment styles are visibly differentiated. New SKU styles require corresponding avatar drawing/asset layers.
- Gender can be changed from Fashion Studio; first-login forced selection and character grid are not yet integrated with login.
- Item achievement unlock requirements are displayed as locked but not dynamically evaluated.
- The `wear` API currently performs delete then insert as two database operations, not one atomic RPC; improve transactionality before production.
- Requires Supabase integration tests and build checks before official deployment.
