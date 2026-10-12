import {NextRequest,NextResponse} from 'next/server';
import {adminDb,serverDb} from '@/lib/supabase-server';
export const runtime='nodejs';
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
async function teacher(){const auth=await serverDb();const {data:{user}}=await auth.auth.getUser();if(!user)return null;const db=adminDb();const {data:p}=await db.from('profiles').select('role').eq('id',user.id).maybeSingle();return p?.role==='teacher'?{db}:null;}
export async function GET(){const ctx=await teacher();if(!ctx)return fail('Teacher access required',403);const {data,error}=await ctx.db.from('shop_items').select('id,name,sku,slot,gender,asset_url,price,available').order('name');return error?fail(error.message,500):NextResponse.json({items:data||[]});}
export async function POST(req:NextRequest){const ctx=await teacher();if(!ctx)return fail('Teacher access required',403);
 try{const form=await req.formData();const file=form.get('file');const id=String(form.get('itemId')||'');const {data:item}=await ctx.db.from('shop_items').select('id').eq('id',id).maybeSingle();if(!item)return fail('Invalid shop item');
 if(!(file instanceof File)||!['image/png','image/webp'].includes(file.type)||file.size===0||file.size>3*1024*1024)return fail('Upload a PNG or WebP under 3 MB');
 const ext=file.type==='image/png'?'png':'webp';const path=`items/${id}/${crypto.randomUUID()}.${ext}`;
 const {error:up}=await ctx.db.storage.from('fashion-assets').upload(path,await file.arrayBuffer(),{contentType:file.type,upsert:false,cacheControl:'3600'});if(up)return fail(up.message,500);
 const {data:url}=ctx.db.storage.from('fashion-assets').getPublicUrl(path);
 const {error:save}=await ctx.db.from('shop_items').update({asset_url:url.publicUrl}).eq('id',id);if(save)return fail(save.message,500);
 return NextResponse.json({asset_url:url.publicUrl});
 }catch(e){return fail(e instanceof Error?e.message:'Upload failed',500);}}
