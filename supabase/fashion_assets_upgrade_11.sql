-- Apply after fashion_upgrade_10.sql. Public read for published fashion layers;
-- uploads are restricted to the teacher-only API using the service-role key.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('fashion-assets','fashion-assets',true,3145728,array['image/png','image/webp'])
on conflict(id) do update set public=true,file_size_limit=3145728,allowed_mime_types=array['image/png','image/webp'];
-- Public images are served through Supabase Storage's public object endpoint.
-- No client INSERT/UPDATE/DELETE storage policies are granted.
