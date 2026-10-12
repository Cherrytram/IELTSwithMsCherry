import {NextRequest,NextResponse} from 'next/server';
import {adminDb,serverDb} from '@/lib/supabase-server';
export const runtime='nodejs';
export async function POST(req:NextRequest){try{
 const auth=await serverDb();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const {attemptId,questionId}=await req.json();const db=adminDb();
 const {data:a}=await db.from('activity_attempts').select('activity_id,answers').eq('id',attemptId).maybeSingle();if(!a)return NextResponse.json({error:'Not found'},{status:404});
 const {data:act}=await db.from('lesson_activities').select('lesson_id').eq('id',a.activity_id).single();const {data:l}=act?await db.from('lessons').select('unit_id').eq('id',act.lesson_id).single():{data:null};const {data:u}=l?await db.from('course_units').select('course_id').eq('id',l.unit_id).single():{data:null};const {data:c}=u?await db.from('courses').select('class_id').eq('id',u.course_id).single():{data:null};
 const {data:owned}=c?await db.from('classes').select('id').eq('id',c.class_id).eq('teacher_id',user.id).maybeSingle():{data:null};if(!owned)return NextResponse.json({error:'Forbidden'},{status:403});
 const path=a.answers?.[questionId];if(typeof path!=='string'||!path.startsWith('speaking/'))return NextResponse.json({error:'No audio'},{status:404});
 const {data,error}=await db.storage.from('ielts-media').createSignedUrl(path,600);if(error)throw error;return NextResponse.json({url:data.signedUrl});
 }catch(e){console.error('Teacher audio',e);return NextResponse.json({error:'Playback failed'},{status:500});}}
