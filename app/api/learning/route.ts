import {NextRequest,NextResponse} from 'next/server';
import {adminDb,serverDb} from '@/lib/supabase-server';
export const runtime='nodejs';
const bad=(message:string,status=400)=>NextResponse.json({error:message},{status});
const isId=(x:unknown)=>typeof x==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(x);
const normalize=(x:unknown)=>String(x??'').trim().replace(/\s+/g,' ').toLowerCase();
type Q={id:string;type:string;prompt:string;options?:string[];correctAnswer?:string;alternatives?:string[];explanation?:string;points?:number};
function publicContent(raw:any,kind:string){const c=raw&&typeof raw==='object'?raw:{};return {instructions:c.instructions||'',passage:c.passage||'',audioUrl:c.audioUrl||'',transcript:kind==='exam'?'':c.transcript||'',vocabularyWords:Array.isArray(c.vocabularyWords)?c.vocabularyWords.map((w:any)=>({id:w.id,term:w.term,meaning:w.meaning,example:w.example})):[],questions:(Array.isArray(c.questions)?c.questions:[]).map((q:Q)=>({id:q.id,type:q.type,prompt:q.prompt,options:q.options||[],points:q.points||1}))};}
export async function POST(req:NextRequest){
 try{
  const auth=await serverDb();const {data:{user}}=await auth.auth.getUser();if(!user)return bad('Sign in required',401);
  const db=adminDb();const body=await req.json();const action=body.action;
  if(!['catalog','open','save','submit','history','complete_theory','exam_status'].includes(action))return bad('Unknown action');
  const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).maybeSingle();if(profile?.role!=='student')return bad('Student access only',403);
  if(action==='catalog'){
   const {data:enrollments}=await db.from('enrollments').select('class_id').eq('student_id',user.id).eq('archived',false);
   const ids=(enrollments||[]).map(x=>x.class_id);if(!ids.length)return NextResponse.json({courses:[],units:[],lessons:[],activities:[]});
   const {data:c}=await db.from('courses').select('id,class_id,title,description,position').in('class_id',ids).eq('published',true).order('position');
   const {data:u}=c?.length?await db.from('course_units').select('id,course_id,title,description,position').in('course_id',c.map(x=>x.id)).eq('published',true).order('position'):{data:[]};
   const {data:l}=u?.length?await db.from('lessons').select('id,unit_id,title,description,position').in('unit_id',u.map(x=>x.id)).eq('published',true).order('position'):{data:[]};
   const {data:a}=l?.length?await db.from('lesson_activities').select('id,lesson_id,title,skill,kind,position').in('lesson_id',l.map(x=>x.id)).eq('published',true).order('position'):{data:[]};
   const {data:completed}=a?.length?await db.from('activity_attempts').select('activity_id').eq('student_id',user.id).in('activity_id',a.map(x=>x.id)).neq('status','draft'):{data:[]};return NextResponse.json({courses:c||[],units:u||[],lessons:l||[],activities:a||[],completedIds:[...new Set((completed||[]).map(x=>x.activity_id))]});
  }
  if(!isId(body.activityId))return bad('Invalid activity');
  const {data:a,error:ae}=await db.from('lesson_activities').select('*').eq('id',body.activityId).eq('published',true).maybeSingle();if(ae||!a)return bad('Activity not available',404);
  const {data:lesson}=await db.from('lessons').select('unit_id,published').eq('id',a.lesson_id).single();
  const {data:unit}=lesson?await db.from('course_units').select('course_id,published').eq('id',lesson.unit_id).single():{data:null};
  const {data:course}=unit?await db.from('courses').select('class_id,published').eq('id',unit.course_id).single():{data:null};
  if(!lesson?.published||!unit?.published||!course?.published)return bad('Activity not published',403);
  const {data:enrolled}=await db.from('enrollments').select('student_id').eq('class_id',course.class_id).eq('student_id',user.id).eq('archived',false).maybeSingle();if(!enrolled)return bad('Not enrolled',403);
  const {data:attempts,error:attemptError}=await db.from('activity_attempts').select('*').eq('student_id',user.id).eq('activity_id',a.id).order('created_at',{ascending:false});if(attemptError)throw attemptError;
  if(action==='history')return NextResponse.json({attempts:(attempts||[]).filter(x=>x.status!=='draft').map(x=>({id:x.id,status:x.status,score:x.score,max_score:x.max_score,submitted_at:x.submitted_at,teacher_feedback:x.teacher_feedback,teacher_rubric:x.teacher_rubric,teacher_band:x.teacher_band,result:x.result,transcript:a.content?.transcript||''}))});
  // Enforce sequential published activities inside the lesson, without any score threshold.
  const {data:siblings,error:se}=await db.from('lesson_activities').select('id,position').eq('lesson_id',a.lesson_id).eq('published',true).order('position').order('id');if(se)throw se;
  const prior=(siblings||[]).slice(0,(siblings||[]).findIndex(x=>x.id===a.id)).map(x=>x.id);
  if(prior.length){const {data:done,error:de}=await db.from('activity_attempts').select('activity_id').eq('student_id',user.id).in('activity_id',prior).neq('status','draft');if(de)throw de;if(prior.some(id=>!(done||[]).some(x=>x.activity_id===id)))return bad('Complete earlier activities in this lesson first',403);}
  const draft=(attempts||[]).find(x=>x.status==='draft');
  const examMinutes=Math.max(1,Math.min(180,Number(a.content?.examMinutes)|| (a.skill==='reading'?60:30)));
  const examDeadline=(started:string)=>new Date(new Date(started).getTime()+examMinutes*60000).toISOString();
  const examExpired=!!(a.kind==='exam'&&draft&&Date.now()>=Date.parse(examDeadline(draft.created_at)));
  if(action==='exam_status')return NextResponse.json({deadline:draft&&a.kind==='exam'?examDeadline(draft.created_at):null,expired:examExpired});
  if(a.kind==='exam'&&examExpired&&action==='save')return bad('Exam time has expired',409);
  if(a.kind==='exam'&&examExpired&&action==='open')return bad('Exam time has expired. Submit your answers.',409);
  if(action==='open'){
   let current=draft;
   if(a.kind==='exam'&&!current){const {data:created,error:ce}=await db.from('activity_attempts').insert({activity_id:a.id,student_id:user.id,answers:{}}).select('*').single();if(ce)throw ce;current=created;}
   return NextResponse.json({activity:{id:a.id,title:a.title,skill:a.skill,kind:a.kind,content:publicContent(a.content,a.kind)},deadline:a.kind==='exam'&&current?examDeadline(current.created_at):null,draft:current?{answers:current.answers}:null,attempts:(attempts||[]).filter(x=>x.status!=='draft').map(x=>({id:x.id,status:x.status,score:x.score,max_score:x.max_score,submitted_at:x.submitted_at,teacher_feedback:x.teacher_feedback,teacher_rubric:x.teacher_rubric,teacher_band:x.teacher_band,result:x.result,transcript:a.content?.transcript||''}))});}
  if(action==='complete_theory'){if(a.kind!=='theory')return bad('Not a theory activity');if(!(attempts||[]).some(x=>x.status==='submitted')){const {error}=await db.from('activity_attempts').insert({activity_id:a.id,student_id:user.id,answers:{},status:'submitted',score:0,max_score:0,submitted_at:new Date().toISOString()});if(error)throw error;}return NextResponse.json({ok:true});}
  if(!body.answers||typeof body.answers!=='object'||Array.isArray(body.answers)||JSON.stringify(body.answers).length>50000)return bad('Invalid answers');
  const words:Array<{id:string;term:string;meaning:string;example:string}>=a.skill==='vocabulary'&&Array.isArray(a.content?.vocabularyWords)?a.content.vocabularyWords:[];
  const questions:Array<Q>=words.length?words.flatMap(w=>[{id:`recognize:${w.id}`,type:'short_answer',prompt:w.term,correctAnswer:w.meaning,points:1},{id:`match:${w.id}`,type:'short_answer',prompt:w.term,correctAnswer:w.meaning,points:1},{id:`spell:${w.id}`,type:'short_answer',prompt:w.meaning,correctAnswer:w.term,points:1},{id:`apply:${w.id}`,type:'short_answer',prompt:w.example,correctAnswer:w.term,points:1}]):Array.isArray(a.content?.questions)?a.content.questions:[];
  const allowed=new Set(questions.map(q=>q.id));const answers:Record<string,string>={};
  for(const [key,value] of Object.entries(body.answers)){if(!allowed.has(key)||typeof value!=='string'||value.length>20000)return bad('Invalid answer field');answers[key]=value;}
  // Recording answers must point only to an audio object uploaded by this student for this activity.
  for(const q of questions.filter(x=>x.type==='recording')){const v=answers[q.id];if(v&&!new RegExp('^speaking/'+user.id+'/'+a.id+'/'+q.id+'/[a-f0-9-]+\\.(webm|mp3|m4a|wav)$','i').test(v))return bad('Invalid recording reference');}
  if(action==='save'){
   if(a.kind==='exam'&&!draft)return bad('Start the exam before saving',409);
   if(draft){const {error}=await db.from('activity_attempts').update({answers,updated_at:new Date().toISOString()}).eq('id',draft.id).eq('status','draft');if(error)throw error;}
   else{const {error}=await db.from('activity_attempts').insert({activity_id:a.id,student_id:user.id,answers});if(error)throw error;}
   return NextResponse.json({ok:true});
  }
  if(a.kind==='exam'&&!draft)return bad('Start the exam before submitting',409);
  const effectiveAnswers=examExpired?(draft?.answers||{}):answers;
  const grading=questions.map(q=>{const manual=['essay','recording'].includes(q.type);const value=effectiveAnswers[q.id]||'';const accepted=[q.correctAnswer||'',...(q.alternatives||[])].map(normalize);const correct=!manual&&accepted.includes(normalize(value));return {id:q.id,answer:value,correct:manual?null:correct,points:correct?(q.points||1):0,maxPoints:q.points||1,...(!manual?{correctAnswer:q.correctAnswer||'',explanation:q.explanation||''}:{})};});
  const manual=questions.some(q=>['essay','recording'].includes(q.type));const score=grading.reduce((s,q)=>s+q.points,0),maxScore=grading.reduce((s,q)=>s+q.maxPoints,0);
  const result={grading,requiresTeacher:manual};const status=manual?'pending_teacher':'submitted';
  const payload={activity_id:a.id,student_id:user.id,answers:examExpired?(draft?.answers||{}):answers,result,status,score:manual?null:score,max_score:maxScore,submitted_at:new Date().toISOString(),updated_at:new Date().toISOString()};
  const query=draft?db.from('activity_attempts').update(payload).eq('id',draft.id).eq('status','draft'):db.from('activity_attempts').insert(payload);
  const {data:saved,error}=await query.select('id').single();if(error)throw error;
  let coinsAwarded=0;
  if(!manual&&a.kind!=='theory'){const reward=await db.rpc('award_activity_coins',{p_attempt:saved.id});if(reward.error)throw reward.error;coinsAwarded=reward.data||0;}
  return NextResponse.json({ok:true,attemptId:saved.id,status,score:manual?null:score,maxScore,grading,coinsAwarded,transcript:a.content?.transcript||''});
 }catch(e){console.error('Learning API',e);return bad('Learning request failed',500)}
}
