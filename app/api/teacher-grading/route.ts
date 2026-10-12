import {NextRequest,NextResponse} from 'next/server';
import {adminDb,serverDb} from '@/lib/supabase-server';
export const runtime='nodejs';
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
const uuid=(v:unknown)=>typeof v==='string'&&/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(v);
export async function POST(req:NextRequest){
 try{
  const auth=await serverDb();const {data:{user}}=await auth.auth.getUser();if(!user)return fail('Sign in required',401);
  const db=adminDb();const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();if(profile?.role!=='teacher')return fail('Teacher access only',403);
  const body=await req.json();if(!['list','grade'].includes(body.action))return fail('Invalid action');
  const {data:classes,error:ce}=await db.from('classes').select('id,name').eq('teacher_id',user.id);if(ce)throw ce;
  const classIds=(classes||[]).map(c=>c.id);if(!classIds.length)return NextResponse.json({attempts:[],classes:[]});
  if(body.action==='list'){
   const {data:courses,error:e1}=await db.from('courses').select('id').in('class_id',classIds);if(e1)throw e1;
   const {data:units,error:e2}=(courses||[]).length?await db.from('course_units').select('id').in('course_id',courses!.map(x=>x.id)):{data:[],error:null};if(e2)throw e2;
   const {data:lessons,error:e3}=(units||[]).length?await db.from('lessons').select('id').in('unit_id',units!.map(x=>x.id)):{data:[],error:null};if(e3)throw e3;
   const {data:activities,error:e4}=(lessons||[]).length?await db.from('lesson_activities').select('id,title,skill').in('lesson_id',lessons!.map(x=>x.id)).in('skill',['writing','speaking']):{data:[],error:null};if(e4)throw e4;
   const {data:attempts,error:e5}=(activities||[]).length?await db.from('activity_attempts').select('id,student_id,activity_id,status,answers,submitted_at,teacher_feedback,teacher_rubric,teacher_band').in('activity_id',activities!.map(x=>x.id)).in('status',['pending_teacher','graded']).order('submitted_at',{ascending:false}).limit(200):{data:[],error:null};if(e5)throw e5;
   const studentIds=[...new Set((attempts||[]).map(x=>x.student_id))];
   const {data:students}=studentIds.length?await db.from('profiles').select('id,display_name').in('id',studentIds):{data:[]};
   return NextResponse.json({attempts:(attempts||[]).map(a=>({...a,activity:activities!.find(x=>x.id===a.activity_id),student:students?.find(x=>x.id===a.student_id)?.display_name||'Student'}))});
  }
  if(!uuid(body.attemptId))return fail('Invalid attempt');
  const {data:attempt}=await db.from('activity_attempts').select('id,activity_id,status').eq('id',body.attemptId).maybeSingle();if(!attempt||!['pending_teacher','graded'].includes(attempt.status))return fail('Attempt unavailable',404);
  const {data:activity}=await db.from('lesson_activities').select('lesson_id,skill').eq('id',attempt.activity_id).single();if(!activity||!['writing','speaking'].includes(activity.skill))return fail('Not a teacher-graded activity');
  const {data:lesson}=await db.from('lessons').select('unit_id').eq('id',activity.lesson_id).single();
  const {data:unit}=lesson?await db.from('course_units').select('course_id').eq('id',lesson.unit_id).single():{data:null};
  const {data:course}=unit?await db.from('courses').select('class_id').eq('id',unit.course_id).single():{data:null};
  if(!course||!classIds.includes(course.class_id))return fail('Not your class',403);
  const rubric=body.rubric;if(!rubric||typeof rubric!=='object'||Array.isArray(rubric))return fail('Four rubric scores required');
  const keys=activity.skill==='writing'?['task','coherence','lexical','grammar']:['fluency','lexical','grammar','pronunciation'];
  if(keys.some(k=>typeof rubric[k]!=='number'||rubric[k]<0||rubric[k]>9||rubric[k]*2%1!==0))return fail('Each rubric score must be 0–9 in 0.5 increments');
  const band=Math.round((keys.reduce((s,k)=>s+rubric[k],0)/4)*2)/2;
  if(typeof body.feedback!=='string'||body.feedback.length>10000)return fail('Invalid feedback');
  const {error:up}=await db.from('activity_attempts').update({status:'graded',teacher_rubric:rubric,teacher_band:band,teacher_feedback:body.feedback,graded_at:new Date().toISOString()}).eq('id',attempt.id);if(up)throw up;
  const {data:coins,error:re}=await db.rpc('award_activity_coins',{p_attempt:attempt.id});if(re)throw re;
  return NextResponse.json({ok:true,band,coinsAwarded:coins});
 }catch(e){console.error('Teacher grading API',e);return fail('Grading request failed',500)}
}
