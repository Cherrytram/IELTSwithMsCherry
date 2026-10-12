import {NextRequest,NextResponse} from 'next/server';
import {adminDb,serverDb} from '@/lib/supabase-server';
export const runtime='nodejs';
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
const uuid=(s:unknown)=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
const slots=['hair','top','bottom','shoes','accessory','background'];
type Selection=Record<string,string>;
export async function POST(req:NextRequest){
 try{
  const auth=await serverDb();const {data:{user}}=await auth.auth.getUser();if(!user)return fail('Please sign in',401);
  const db=adminDb();const {data:p}=await db.from('profiles').select('role').eq('id',user.id).maybeSingle();if(p?.role!=='student')return fail('Students only',403);
  const body=await req.json();const action=String(body.action||'load');
  const load=async()=>{
   const [{data:items,error:ie},{data:owned,error:oe},{data:eq,error:ee},{data:avatar},{data:wallet},{data:outfits,error:se}]=await Promise.all([
    db.from('shop_items').select('id,sku,name,slot,price,emoji,rarity,gender,asset_url,available,collection_name,unlock_requirement').order('price'),
    db.from('inventory').select('item_id').eq('student_id',user.id),
    db.from('equipped').select('slot,item_id').eq('student_id',user.id),
    db.from('avatar_settings').select('style').eq('student_id',user.id).maybeSingle(),
    db.from('wallets').select('balance').eq('student_id',user.id).maybeSingle(),
    db.from('saved_outfits').select('id,name,gender,item_ids,created_at').eq('student_id',user.id).order('created_at',{ascending:false})
   ]);
   if(ie||oe||ee||se)throw ie||oe||ee||se;
   return {items:items||[],owned:(owned||[]).map(x=>x.item_id),equipped:eq||[],gender:avatar?.style||null,coins:wallet?.balance||0,outfits:outfits||[]};
  };
  if(action==='load')return NextResponse.json(await load());
  if(action==='gender'){
   if(!['boy','girl'].includes(body.gender))return fail('Invalid character');
   const {error}=await db.from('avatar_settings').upsert({student_id:user.id,style:body.gender});if(error)throw error;
   return NextResponse.json(await load());
  }
  if(action==='buy'){
   if(!uuid(body.itemId))return fail('Invalid item');
   const {data:item}=await db.from('shop_items').select('id,available,gender,unlock_requirement').eq('id',body.itemId).maybeSingle();
   const {data:avatar}=await db.from('avatar_settings').select('style').eq('student_id',user.id).maybeSingle();
   if(!item?.available||item.unlock_requirement||!avatar||!(item.gender==='unisex'||item.gender===avatar.style))return fail('Item not available',403);
   const {error}=await db.rpc('buy_shop_item',{p_student:user.id,p_item:body.itemId});if(error)return fail(error.message,409);
   return NextResponse.json(await load());
  }
  const validate=async(input:unknown,gender:string)=>{
   if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Invalid outfit');
   const entries=Object.entries(input as Selection);if(entries.length>slots.length)throw new Error('Too many items');
   const ids=entries.map(([slot,id])=>{if(!slots.includes(slot)||!uuid(id))throw new Error('Invalid slot or item');return id;});
   const {data:owned}=ids.length?await db.from('inventory').select('item_id').eq('student_id',user.id).in('item_id',ids):{data:[]};
   const {data:items}=ids.length?await db.from('shop_items').select('id,slot,gender').in('id',ids):{data:[]};
   for(const [slot,id] of entries){if(!(owned||[]).some(x=>x.item_id===id)||!(items||[]).some(x=>x.id===id&&x.slot===slot&&(x.gender==='unisex'||x.gender===gender)))throw new Error('Outfit contains an item you cannot wear');}
   return Object.fromEntries(entries.sort(([a],[b])=>a.localeCompare(b)));
  };
  if(['wear','save_outfit','delete_outfit'].includes(action)){
   const {data:avatar}=await db.from('avatar_settings').select('style').eq('student_id',user.id).maybeSingle();if(!avatar)return fail('Choose a character first',409);
   if(action==='delete_outfit'){
    if(!uuid(body.outfitId))return fail('Invalid outfit');
    const {error}=await db.from('saved_outfits').delete().eq('student_id',user.id).eq('id',body.outfitId);if(error)throw error;
    return NextResponse.json(await load());
   }
   let selection:Selection;
   try{selection=await validate(body.selection,avatar.style);}catch(e){return fail(e instanceof Error?e.message:'Invalid outfit');}
   if(action==='save_outfit'){
    const signature=JSON.stringify({gender:avatar.style,selection});
    const {count}=await db.from('saved_outfits').select('id',{count:'exact',head:true}).eq('student_id',user.id);
    const name=typeof body.name==='string'&&body.name.trim()?body.name.trim().slice(0,60):`Outfit ${(count||0)+1}`;
    const {error}=await db.from('saved_outfits').insert({student_id:user.id,name,gender:avatar.style,item_ids:selection,signature});
    if(error)return fail(error.code==='23505'?'This outfit is already saved':error.message,409);
    return NextResponse.json(await load());
   }
   // Save a complete outfit: clear previous slot assignments then insert selected owned items.
   // A failed insert should be retried; ownership is validated before any mutation.
   const {error:del}=await db.from('equipped').delete().eq('student_id',user.id);if(del)throw del;
   const entries=Object.entries(selection).map(([slot,item_id])=>({student_id:user.id,slot,item_id}));
   if(entries.length){const {error}=await db.from('equipped').insert(entries);if(error)throw error;}
   return NextResponse.json(await load());
  }
  return fail('Unknown action');
 }catch(e){console.error('Fashion API',e);return fail('Fashion request failed',500);}
}
