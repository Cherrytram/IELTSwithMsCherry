import { NextRequest, NextResponse } from 'next/server';
import { adminDb, serverDb } from '@/lib/supabase-server';
export async function GET(req:NextRequest){
 const {data:{user}}=await (await serverDb()).auth.getUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const path=req.nextUrl.searchParams.get('path')||'';const cls=path.split('/')[0];if(!/^[0-9a-f-]{36}$/i.test(cls)||path.includes('..'))return NextResponse.json({error:'Invalid path'},{status:400});
 const db=adminDb();const {data:c}=await db.from('classes').select('teacher_id').eq('id',cls).single();if(!c)return NextResponse.json({error:'Not found'},{status:404});
 if(c.teacher_id!==user.id){
 const {data:e}=await db.from('enrollments').select('class_id').eq('class_id',cls).eq('student_id',user.id).maybeSingle();if(!e)return NextResponse.json({error:'Forbidden'},{status:403});
 const ownRecording=path.split('/')[1]===user.id;
 const {data:units}=await db.from('content_units').select('audio_path,image_path').eq('class_id',cls).eq('published',true);
 const publishedMedia=(units||[]).some(u=>u.audio_path===path||u.image_path===path);
 if(!ownRecording&&!publishedMedia)return NextResponse.json({error:'Forbidden'},{status:403});
 }
 const {data,error}=await db.storage.from('ielts-media').createSignedUrl(path,60);if(error)return NextResponse.json({error:'Missing file'},{status:404});return NextResponse.redirect(data.signedUrl);
}
