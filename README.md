# IELTS Fashion Academy – Online V2 (7 học sinh)

# IELTS Fashion Academy — Next.js + Supabase

An initial **deployable source-code foundation** for the IELTS Fashion Academy discussed with the teacher. It is not a live deployed site until you supply a Supabase project and deploy to Vercel.

## Features implemented in source

- Teacher email/password signup and login; students use **class code + student code + password/PIN (minimum 8 characters)**, created by teacher (no student email required).
- Teacher creates classes, student accounts, and tracks all students' Listening, Reading, Writing and Speaking submission counts; CSV export.
- Cambridge **16–21 → Test 1–4 → Listening Part 1–4 / Reading Passage 1–3**.
- Teacher editor with **Theory, Mini Test, Cambridge Test**, audio/image upload, and text/passage input.
- MCQ, fill-in, dropdown; paste bulk questions, parse and click correct answers; `==` prefix optional.
- Theory completion, 80% Mini Test threshold, then exam; server-side prerequisite enforcement; sequential parts/passages.
- Split-screen questions/source and answer sheet; server-side grading, answer review and explanations.
- Wallet rewards (maximum 100 per Part), best-result-only bonus, PostgreSQL atomic rewards and purchases.
- Shop, inventory, boy/girl avatar selection, emoji preview.
- Writing text submissions; Speaking recording upload; teacher progress overview.

## Setup

1. Install **Node.js 20+**.
2. Create a Supabase project at https://supabase.com. In **SQL Editor**, execute `supabase/schema.sql` once.
3. In Supabase **Authentication → Providers → Email**, enable email/password. Teacher signup may require email verification; follow the confirmation email. For a private school deployment, consider disabling open teacher signup and provisioning teacher accounts through an admin instead.
4. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL`: Project URL.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase publishable/anon key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase service-role key **server-only**; NEVER use a `NEXT_PUBLIC_` prefix or commit it.
5. Run `npm install` and `npm run dev`; open http://localhost:3000.
6. Register a teacher, create a class (e.g. `IELTS10A`), create a student (`HS001`, password 8+ chars). Sign out; student logs in using those codes and password.
7. As teacher, open **Teacher Studio** and save Theory, Mini Test and Cam Test. Enable **Xuất bản**. As student, follow the learning journey.

## Deploy to Vercel

1. Push this folder to a **private GitHub repository** (never commit `.env.local`).
2. In https://vercel.com, **Add New Project → Import** your repository; Framework = Next.js.
3. Add all three environment variables from `.env.local` to Vercel project settings, then Deploy.
4. In Supabase **Authentication → URL Configuration**, set Site URL to the Vercel HTTPS domain and add the domain to allowed redirect URLs.
5. Test both teacher and student logins on the deployed URL. HTTPS is required for microphone capture.
6. Set appropriate backups, retention, content licenses, teacher access restrictions and privacy notices before using real student data.

## Bulk input syntax

```text
1. Where is the meeting?
A. Library
B. Hall
==C. Room 12
D. Gym

2. [select] Which day is the event?
A. Monday
==B. Wednesday
C. Friday

3. The meeting starts at _____. 
==9:30
```

Click **✨ Tự tạo câu hỏi**, then click the correct option or type a fill-in answer, edit explanations and save.

## Architecture / security notes

- The browser uses Supabase Auth; `@supabase/ssr` shares login state with Next.js route handlers.
- Tables use **RLS enabled without public policies**. All database reads/writes go through authenticated server routes, with teacher ownership or student enrollment checked before the service-role client accesses data.
- Shop purchase and exam coin updates use transactional PostgreSQL RPC functions.
- Media bucket is private, served with short-lived signed URLs after class permission checks.
- Synthetic student email addresses are an internal Supabase Auth identifier, **not real email inboxes**. Teacher manages student passwords; student password reset and class transfers need a dedicated admin workflow before broad production rollout.

## Deliberately not yet implemented

- Official Cambridge IELTS 16–21 audio/passages/questions: **not included**; upload only materials you are licensed to use.
- Actual anime 2D layered PNG wardrobe (currently emoji-based avatar preview).
- AI band estimates for Writing/Speaking, transcription and teacher feedback editor.
- Automatic 14-day email reports; configure a verified sender and scheduler separately.
- Full question types such as matching headings, drag-and-drop, map labeling, multi-select, and multiple acceptable spelling rules beyond simple fill-in aliases.
- Fine-grained publication scheduling, time limits, anti-cheating and full audit logs.

**Deployment status:** source code created, static TypeScript/TSX syntax checked. A complete `npm install`, production build and browser-based end-to-end test could not be performed in the current offline environment. Please run `npm run build` after installing dependencies, then test before inviting students.

## Optional 14-day teacher report email

A Vercel Cron handler is included at `/api/cron/fortnightly`, scheduled daily at **02:00 UTC**. It checks each class on 14-day intervals from its creation and emails a summary through Resend. Set `CRON_SECRET`, `RESEND_API_KEY`, `REPORT_FROM_EMAIL` (a **verified sender domain**) and `REPORT_TO_EMAIL` in Vercel. Default recipient in `.env.example`: `ngoctramnt@skylineschool.edu.vn`. No emails are sent until configured and deployed. Report dispatch should be load-tested and strengthened with a claim/lock for high-volume deployments; the current `report_runs` table deduplicates successful deliveries but is not an exactly-once delivery guarantee.


## AI Writing / Speaking V2
Run `supabase/ai_v2.sql` after `schema.sql`. Configure server-side OpenAI key and `AI_GRADING_ENABLED=true`. Students can request grading for saved work, receive Vietnamese rubric feedback and teacher can review it. See `DEPLOY_VI.md` for details.


## V3 – Fashion Studio có thể thay đồ trực tiếp

- `components/FashionAvatar.tsx`: nhân vật vector SVG nhiều lớp, cả nam và nữ; tóc, áo, quần/váy, giày, phụ kiện, nền thay đổi theo vật phẩm. Không cần tải hình bên ngoài.
- Fashion Shop có **Thử đồ** (không trừ xu), **Mua đồ** và **Mặc ngay**. Wardrobe có trạng thái đang mặc và lưu lựa chọn qua API Supabase `equip`.
- V3 giữ nguyên backend, database và AI V2, **không cần migration SQL mới** nếu đã cài schema V2.
- Lưu ý: Đây là minh họa vector 2D có thay đồ thực sự, không phải bộ tranh Anime cao cấp vẽ tay; muốn đổi phong cách minh họa có thể thay SVG bằng bộ asset đồng bộ sau.


## V4 – Submission modes
Writing/Speaking have explicit **Submit to Teacher** (default, no AI call or quota use) and **Submit & Get AI Feedback** (save first, then AI). Apply `supabase/submission_modes_v4.sql` to existing V3 database before deployment. Teacher dashboard shows submission modes and feedback; student can request AI on a saved work later.
