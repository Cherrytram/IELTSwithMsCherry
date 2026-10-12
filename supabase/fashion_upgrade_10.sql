-- Apply after schema.sql and upgrades 01-09. Existing shop and inventory are retained.
alter table public.shop_items add column if not exists gender text not null default 'unisex' check (gender in ('boy','girl','unisex'));
alter table public.shop_items add column if not exists asset_url text;
alter table public.shop_items add column if not exists available boolean not null default true;
alter table public.shop_items add column if not exists collection_name text not null default 'Starter';
alter table public.shop_items add column if not exists unlock_requirement text;
create table if not exists public.saved_outfits (
 id uuid primary key default gen_random_uuid(),
 student_id uuid not null references public.profiles(id) on delete cascade,
 name text not null,
 gender text not null check(gender in ('boy','girl')),
 item_ids jsonb not null default '{}'::jsonb,
 signature text not null,
 created_at timestamptz not null default now(),
 unique(student_id,signature)
);
create index if not exists saved_outfits_student on public.saved_outfits(student_id,created_at desc);
alter table public.saved_outfits enable row level security;
-- API uses service role only, after checking authenticated student ownership.
-- Starter catalogue: 12 existing items plus gender-specific items, compatible with the SVG avatar.
insert into public.shop_items(sku,name,slot,price,emoji,rarity,gender,collection_name) values
 ('boy-hair-classic','Classic Boy Hair','hair',0,'💇','common','boy','Starter'),
 ('girl-hair-classic','Classic Girl Hair','hair',0,'💇‍♀️','common','girl','Starter'),
 ('boy-shirt','Sky Blue Tee','top',0,'👕','common','boy','Starter'),
 ('girl-shirt','Pink Tee','top',0,'👚','common','girl','Starter'),
 ('boy-trousers','Classic Trousers','bottom',0,'👖','common','boy','Starter'),
 ('girl-skirt','Pastel Skirt','bottom',0,'👗','common','girl','Starter'),
 ('boy-trainers','Everyday Trainers','shoes',0,'👟','common','boy','Starter'),
 ('girl-flats','Everyday Flats','shoes',0,'👟','common','girl','Starter'),
 ('boy-cap','Anime Cap','accessory',95,'🧢','common','boy','Campus'),
 ('girl-bow','Sakura Bow','accessory',95,'🎀','common','girl','Campus'),
 ('boy-varsity','Varsity Jacket','top',190,'🧥','rare','boy','Campus'),
 ('girl-cardigan','Cherry Cardigan','top',190,'🧥','rare','girl','Campus'),
 ('boy-shorts','Sport Shorts','bottom',125,'🩳','common','boy','Campus'),
 ('girl-denim','Denim Skirt','bottom',125,'👗','common','girl','Campus'),
 ('boy-high-tops','High-top Sneakers','shoes',155,'👟','rare','boy','Campus'),
 ('girl-boots','Ribbon Boots','shoes',155,'🥾','rare','girl','Campus')
on conflict(sku) do nothing;
