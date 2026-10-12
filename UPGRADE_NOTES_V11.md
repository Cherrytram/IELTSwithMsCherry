# Upgrade 11 – Layered fashion assets

This update adds teacher-only `/teacher/fashion` for uploading per-item transparent PNG/WebP layers and a teacher-authenticated `/api/fashion-assets` upload endpoint. The avatar renders item layers on a shared 300×430 SVG coordinate system; existing SVG clothing is the fallback when an item has no custom image. Shop cards show the uploaded item art.

## Setup
1. Use this ZIP as the complete replacement for Upgrade 10 (do not combine individual ZIPs).
2. Apply `supabase/fashion_assets_upgrade_11.sql` **after** the previous SQL upgrades. It creates the public-read `fashion-assets` bucket; do not upload private student information to it.
3. Sign in as a teacher and visit `/teacher/fashion` to upload PNG or WebP files (max 3 MB).
4. Make each asset a transparent 300×430 image and position it over the same full-body avatar template. Background images can be opaque. Layer placement is currently fixed; a visual offset editor is not implemented.

## Limitations
- This provides a functional layer-upload and rendering framework, **not** a professionally illustrated 2-character PNG/WebP fashion asset collection. Existing SVG avatars remain as fallbacks.
- The teacher cannot create new shop products on this page; it edits art for existing catalogue items.
- Existing slot system does not yet support a distinct dress slot; top/bottom are separate.
- Asset MIME type and size are validated; binary magic-byte validation and moderation are not implemented.
- Uploads are stored publicly for rendering. Old replaced asset files are not automatically deleted.
- TypeScript/build and live Supabase/Vercel integration must be tested before production deployment.
