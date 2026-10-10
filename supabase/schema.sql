-- Run in Supabase SQL Editor. Service-role key is server-only.
create extension if not exists pgcrypto;
create table if not exists profiles(id uuid primary key references auth.users(id) on delete cascade,role text not null check(role in ('teacher','student')),display_name text not null,created_at timestamptz default now());
create table if not exists classes(id uuid primary key default gen_random_uuid(),teacher_id uuid not null references profiles(id),code text not null unique, name text not null,created_at timestamptz default now());
create table if not exists enrollments(class_id uuid not null references classes(id) on delete cascade,student_id uuid not null references profiles(id) on delete cascade,student_code text not null,primary key(class_id,student_id),unique(class_id,student_code));
create table if not exists content_units(id uuid primary key default gen_random_uuid(),class_id uuid not null references classes(id) on delete cascade,skill text not null check(skill in ('listening','reading')),book int not null check(book between 16 and 21),test int not null check(test between 1 and 4),part int not null check(part between 1 and 4),theory text not null default '',mini_questions jsonb not null default '[]',exam_questions jsonb not null default '[]',source_text text not null default '',audio_path text, image_path text,published boolean not null default false,updated_at timestamptz default now(),unique(class_id,skill,book,test,part));
create table if not exists progress(id uuid primary key default gen_random_uuid(),student_id uuid not null references profiles(id) on delete cascade,unit_id uuid not null references content_units(id) on delete cascade,theory_completed boolean not null default false,mini_passed boolean not null default false,exam_completed boolean not null default false,best_score int not null default 0,best_reward int not null default 0,updated_at timestamptz default now(),unique(student_id,unit_id));
create table if not exists submissions(id uuid primary key default gen_random_uuid(),student_id uuid not null references profiles(id) on delete cascade,unit_id uuid not null references content_units(id) on delete cascade,stage text not null check(stage in ('mini','exam')),answers jsonb not null,grading jsonb not null,correct int not null,total int not null,created_at timestamptz default now());
create table if not exists wallets(student_id uuid primary key references profiles(id) on delete cascade,balance int not null default 0 check(balance>=0));
create table if not exists coin_transactions(id uuid primary key default gen_random_uuid(),student_id uuid not null references profiles(id),amount int not null,reason text not null,ref text not null unique,created_at timestamptz default now());
create table if not exists shop_items(id uuid primary key default gen_random_uuid(),sku text unique not null,name text not null,slot text not null check(slot in ('hair','top','bottom','shoes','accessory','background')),price int not null check(price>=0),emoji text not null,rarity text not null default 'common');
create table if not exists inventory(student_id uuid not null references profiles(id) on delete cascade,item_id uuid not null references shop_items(id),primary key(student_id,item_id));
create table if not exists equipped(student_id uuid not null references profiles(id) on delete cascade,slot text not null,item_id uuid not null references shop_items(id),primary key(student_id,slot));
create table if not exists avatar_settings(student_id uuid primary key references profiles(id) on delete cascade,style text not null default 'girl' check(style in ('girl','boy')));
create table if not exists skill_work(id uuid primary key default gen_random_uuid(),student_id uuid not null references profiles(id) on delete cascade,class_id uuid not null references classes(id),skill text not null check(skill in ('writing','speaking')),part int not null,content text not null default '',audio_path text,teacher_feedback text,created_at timestamptz default now());
-- The app uses the service role in its server API only. Clients cannot directly query these tables.
alter table profiles enable row level security;
alter table classes enable row level security;
alter table enrollments enable row level security;
alter table content_units enable row level security;
alter table progress enable row level security;
alter table submissions enable row level security;
alter table wallets enable row level security;
alter table coin_transactions enable row level security;
alter table shop_items enable row level security;
alter table inventory enable row level security;
alter table equipped enable row level security;
alter table avatar_settings enable row level security;
alter table skill_work enable row level security;
-- Teacher profile created automatically after Supabase Auth signup. Student profiles are created by the teacher API.
create or replace function public.create_teacher_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.raw_user_meta_data->>'role'='teacher' then
  insert into public.profiles(id,role,display_name) values(new.id,'teacher',coalesce(nullif(new.raw_user_meta_data->>'display_name',''),split_part(new.email,'@',1))) on conflict(id) do nothing;
 end if;
 return new;
end $$;
drop trigger if exists auth_teacher_created on auth.users;
create trigger auth_teacher_created after insert on auth.users for each row execute function public.create_teacher_profile();
insert into shop_items(sku,name,slot,price,emoji,rarity) values
('hair-wave','Wavy Hair','hair',100,'💇','common'),('hair-urban','Urban Hair','hair',220,'🧑‍🎤','rare'),('hoodie','Purple Hoodie','top',140,'👕','common'),('jacket','Anime Jacket','top',300,'🧥','rare'),('skirt','Pleated Skirt','bottom',180,'👗','common'),('jeans','Blue Jeans','bottom',130,'👖','common'),('sneakers','White Sneakers','shoes',120,'👟','common'),('boots','Fashion Boots','shoes',260,'🥾','rare'),('glasses','Star Glasses','accessory',110,'🕶️','common'),('crown','Royal Crown','accessory',700,'👑','legendary'),('sakura','Sakura Garden','background',450,'🌸','epic'),('city','Neon City','background',550,'🌃','epic') on conflict(sku) do nothing;
-- Private storage for audio/images/recordings; downloads via signed URLs generated server-side.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('ielts-media','ielts-media',false,15728640,array['audio/mpeg','audio/mp4','audio/wav','audio/webm','image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
-- Atomic wallet updates: service role invokes these only after API authentication/authorization.
create or replace function public.apply_exam_reward(p_student uuid,p_unit uuid,p_reward integer,p_correct integer)
returns integer language plpgsql security definer set search_path=public as $$
declare old_reward integer;delta integer;
begin
 if p_reward<0 or p_reward>100 or p_correct<0 then raise exception 'Invalid reward';end if;
 insert into progress(student_id,unit_id) values(p_student,p_unit) on conflict(student_id,unit_id) do nothing;
 select best_reward into old_reward from progress where student_id=p_student and unit_id=p_unit for update;
 delta:=greatest(0,p_reward-old_reward);
 update progress set exam_completed=true,best_reward=greatest(best_reward,p_reward),best_score=greatest(best_score,p_correct),updated_at=now() where student_id=p_student and unit_id=p_unit;
 if delta>0 then
  insert into wallets(student_id,balance) values(p_student,0) on conflict(student_id) do nothing;
  update wallets set balance=balance+delta where student_id=p_student;
  insert into coin_transactions(student_id,amount,reason,ref) values(p_student,delta,'exam','reward:'||p_student||':'||p_unit||':'||p_reward);
 end if;
 return delta;
end $$;
create or replace function public.buy_shop_item(p_student uuid,p_item uuid)
returns void language plpgsql security definer set search_path=public as $$
declare cost integer;funds integer;
begin
 select price into cost from shop_items where id=p_item;
 if cost is null then raise exception 'Item not found';end if;
 if exists(select 1 from inventory where student_id=p_student and item_id=p_item) then raise exception 'Already owned';end if;
 select balance into funds from wallets where student_id=p_student for update;
 if funds is null or funds<cost then raise exception 'Insufficient coins';end if;
 update wallets set balance=balance-cost where student_id=p_student;
 insert into inventory(student_id,item_id) values(p_student,p_item);
 insert into coin_transactions(student_id,amount,reason,ref) values(p_student,-cost,'purchase','purchase:'||p_student||':'||p_item);
end $$;
revoke all on function public.apply_exam_reward(uuid,uuid,integer,integer) from public,anon,authenticated;
revoke all on function public.buy_shop_item(uuid,uuid) from public,anon,authenticated;
grant execute on function public.apply_exam_reward(uuid,uuid,integer,integer) to service_role;
grant execute on function public.buy_shop_item(uuid,uuid) to service_role;
create table if not exists report_runs(id uuid primary key default gen_random_uuid(),class_id uuid not null references classes(id) on delete cascade,period_start date not null,period_end date not null,sent_at timestamptz default now(),unique(class_id,period_end));
alter table report_runs enable row level security;
