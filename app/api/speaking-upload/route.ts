import {NextRequest,NextResponse} from 'next/server';
import {adminDb,serverDb} from '@/lib/supabase-server';
export const runtime='nodejs';
const id=(x:string)=>/^[a-f\d]{8}-([a-f\d]{4}-){3}[a-f\d]{12}$/i.test(x);
export async function POST(req:NextRequest){
 try{const auth=await serverDb();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Sign in required'},{status:401});
 const db=adminDb();const form=await req.formData();const activityId=String(form.get('activityId')||''),questionId=String(form.get('questionId')||'');const file=form.get('file');
 if(!id(activityId)||!id(questionId)||!(file instanceof File)||file.size===0||file.size>15*1024*1024)return NextResponse.json({error:'Invalid audio (max 15MB)'},{status:400});
 const mime:{[key:string]:string}={'audio/webm':'webm','audio/mpeg':'mp3','audio/mp4':'m4a','audio/wav':'wav','audio/x-wav':'wav'};const ext=mime[file.type];if(!ext)return NextResponse.json({error:'Unsupported audio format'},{status:400});
 const {data:a}=await db.from('lesson_activities').select('id,lesson_id,content,published').eq('id',activityId).single();if(!a?.published||!Array.isArray(a.content?.questions)||!a.content.questions.some((q:{id:string;type:string})=>q.id===questionId&&q.type==='recording'))return NextResponse.json({error:'Recording question unavailable'},{status:404});
 const {data:l}=await db.from('lessons').select('unit_id,published').eq('id',a.lesson_id).single();const {data:u}=l?await db.from('course_units').select('course_id,published').eq('id',l.unit_id).single():{data:null};const {data:c}=u?await db.from('courses').select('class_id,published').eq('id',u.course_id).single():{data:null};
 if(!l?.published||!u?.published||!c?.published)return NextResponse.json({error:'Not published'},{status:403});
 const {data:e}=await db.from('enrollments').select('student_id').eq('student_id',user.id).eq('class_id',c.class_id).eq('archived',false).maybeSingle();if(!e)return NextResponse.json({error:'Not enrolled'},{status:403});
 const path=`speaking/${user.id}/${activityId}/${questionId}/${crypto.randomUUID()}.${ext}`;
 const {error}=await db.storage.from('ielts-media').upload(path,await file.arrayBuffer(),{contentType:file.type,upsert:false});if(error)throw error;
 return NextResponse.json({path});
 }catch(e){console.error('Speaking upload',e);return NextResponse.json({error:'Upload failed'},{status:500});}
}
