import {NextRequest,NextResponse} from 'next/server';
import {adminDb,serverDb} from '@/lib/supabase-server';
export const runtime='nodejs';
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function POST(req:NextRequest){
 try{
  const auth=await serverDb();const {data:{user}}=await auth.auth.getUser();if(!user)return fail('Sign in required',401);
  const db=adminDb();const body=await req.json();const action=String(body.action||'');
  const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();
  if(profile?.role==='teacher'){
   if(action==='classes'){const {data,error}=await db.from('classes').select('id,name,code').eq('teacher_id',user.id).order('name');if(error)throw error;return NextResponse.json({classes:data||[]});}
   if(!uuid(body.classId))return fail('Choose a class');
   const {data:cls}=await db.from('classes').select('id').eq('id',body.classId).eq('teacher_id',user.id).maybeSingle();if(!cls)return fail('Class not found',403);
   if(action==='list'){
    const {data,error}=await db.from('homework_assignments').select('*').eq('class_id',cls.id).order('due_at',{ascending:false});if(error)throw error;
    const {data:enrollments}=await db.from('enrollments').select('student_id,student_code,archived,profiles(display_name)').eq('class_id',cls.id);
    const ids=[...new Set((data||[]).map(x=>x.activity_id))];
    const {data:attempts}=ids.length?await db.from('activity_attempts').select('activity_id,student_id,submitted_at,status,score,max_score').in('activity_id',ids).neq('status','draft'):{data:[]};
    return NextResponse.json({assignments:data||[],students:(enrollments||[]).filter(x=>!x.archived),attempts:attempts||[]});
   }
   if(action==='create'){
    const title=String(body.title||'').trim(),instructions=String(body.instructions||'').trim();
    if(!title||title.length>160||instructions.length>2000||!uuid(body.activityId))return fail('Invalid assignment');
    const due=new Date(body.dueAt);if(!Number.isFinite(due.getTime()))return fail('Invalid deadline');
    const studentId=body.studentId||null;if(studentId&&!uuid(studentId))return fail('Invalid student');
    if(studentId){const {data:e}=await db.from('enrollments').select('student_id').eq('class_id',cls.id).eq('student_id',studentId).eq('archived',false).maybeSingle();if(!e)return fail('Student not enrolled');}
    const {data:activity}=await db.from('lesson_activities').select('id,lesson_id,published').eq('id',body.activityId).maybeSingle();if(!activity?.published)return fail('Activity must be published');
    const {data:lesson}=await db.from('lessons').select('unit_id,published').eq('id',activity.lesson_id).single();
    const {data:unit}=lesson?await db.from('course_units').select('course_id,published').eq('id',lesson.unit_id).single():{data:null};
    const {data:course}=unit?await db.from('courses').select('class_id,published').eq('id',unit.course_id).single():{data:null};
    if(!lesson?.published||!unit?.published||!course?.published||course.class_id!==cls.id)return fail('Activity does not belong to this class');
    const {data:assignment,error}=await db.from('homework_assignments').insert({class_id:cls.id,activity_id:activity.id,student_id:studentId,title,instructions,due_at:due.toISOString(),created_by:user.id}).select('*').single();if(error)throw error;
    const {data:students}=await db.from('enrollments').select('student_id').eq('class_id',cls.id).eq('archived',false);
    const recipients=(students||[]).filter(x=>!studentId||x.student_id===studentId);
    if(recipients.length){const {error:ne}=await db.from('student_notifications').insert(recipients.map(x=>({student_id:x.student_id,title:'New homework: '+title,message:'Due '+due.toLocaleString('en-GB',{timeZone:'UTC'})+' UTC',link:'/learn'})));if(ne)throw ne;}
    return NextResponse.json({assignment});
   }
   if(action==='delete'){
    if(!uuid(body.assignmentId))return fail('Invalid assignment');const {error}=await db.from('homework_assignments').delete().eq('id',body.assignmentId).eq('class_id',cls.id);if(error)throw error;return NextResponse.json({ok:true});
   }
   return fail('Unsupported action');
  }
  if(profile?.role!=='student')return fail('Access denied',403);
  const {data:enrollments}=await db.from('enrollments').select('class_id').eq('student_id',user.id).eq('archived',false);
  const classIds=(enrollments||[]).map(x=>x.class_id);
  if(action==='dashboard'){
   const {data:all}=classIds.length?await db.from('homework_assignments').select('id,class_id,activity_id,student_id,title,instructions,due_at,created_at').in('class_id',classIds).order('due_at',{ascending:true}):{data:[]};
   const assignments=(all||[]).filter(x=>!x.student_id||x.student_id===user.id);
   const activityIds=[...new Set(assignments.map(x=>x.activity_id))];
   const {data:attempts}=activityIds.length?await db.from('activity_attempts').select('activity_id,status,submitted_at,score,max_score').eq('student_id',user.id).in('activity_id',activityIds).neq('status','draft'):{data:[]};
   const {data:wallet}=await db.from('wallets').select('balance').eq('student_id',user.id).maybeSingle();
   const {data:notifications}=await db.from('student_notifications').select('id,title,message,link,read_at,created_at').eq('student_id',user.id).order('created_at',{ascending:false}).limit(30);
   return NextResponse.json({assignments:assignments.map(x=>({...x,attempts:(attempts||[]).filter(a=>a.activity_id===x.activity_id&&a.submitted_at&&Date.parse(a.submitted_at)>=Date.parse(x.created_at))})),notifications:notifications||[],coins:wallet?.balance||0});
  }
  if(action==='read_notification'){
   if(!uuid(body.notificationId))return fail('Invalid notification');const {error}=await db.from('student_notifications').update({read_at:new Date().toISOString()}).eq('id',body.notificationId).eq('student_id',user.id);if(error)throw error;return NextResponse.json({ok:true});
  }
  return fail('Unsupported action');
 }catch(e){console.error('Homework API',e);return fail('Request failed',500)}
}
