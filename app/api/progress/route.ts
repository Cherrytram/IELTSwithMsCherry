import {NextRequest,NextResponse} from 'next/server';
import {adminDb,serverDb} from '@/lib/supabase-server';
export const runtime='nodejs';
const skills=['reading','listening','writing','speaking','vocabulary'];
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
const valid=(s:unknown)=>typeof s==='string'&&/^[a-f0-9-]{36}$/i.test(s);
type Attempt={student_id:string;activity_id:string;score:number|null;max_score:number|null;teacher_band:number|null;submitted_at:string|null};
const percent=(a:Attempt)=>a.score!==null&&a.max_score&&a.max_score>0?100*a.score/a.max_score:null;
const band=(p:number)=>p>=95?9:p>=90?8.5:p>=85?8:p>=80?7.5:p>=75?7:p>=65?6.5:p>=55?6:p>=45?5.5:p>=35?5:p>=25?4.5:4;
export async function POST(req:NextRequest){try{
 const auth=await serverDb();const {data:{user}}=await auth.auth.getUser();if(!user)return fail('Sign in required',401);
 const db=adminDb();const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).maybeSingle();if(!profile)return fail('Access denied',403);
 const body=await req.json();const action=String(body.action||'overview');
 if(action==='save_goal'){
  if(profile.role!=='student')return fail('Students only',403);
  const skill=String(body.skill),target=Number(body.band);
  if(!skills.slice(0,4).includes(skill)||!Number.isFinite(target)||target<0||target>9||target*2%1!==0)return fail('Invalid band goal');
  const {error}=await db.from('student_band_goals').upsert({student_id:user.id,skill,target_band:target},{onConflict:'student_id,skill'});if(error)throw error;
  return NextResponse.json({ok:true});
 }
 if(action!=='overview')return fail('Unsupported action');
 const teacher=profile.role==='teacher';let classIds:string[]=[];let studentIds:string[]=[];
 if(teacher){if(!valid(body.classId))return fail('Choose a class');const {data:cls}=await db.from('classes').select('id').eq('id',body.classId).eq('teacher_id',user.id).maybeSingle();if(!cls)return fail('Class not found',403);classIds=[cls.id];const {data:en}=await db.from('enrollments').select('student_id').eq('class_id',cls.id).eq('archived',false);studentIds=(en||[]).map(x=>x.student_id)}
 else{const {data:en}=await db.from('enrollments').select('class_id').eq('student_id',user.id).eq('archived',false);classIds=(en||[]).map(x=>x.class_id);studentIds=[user.id]}
 if(!classIds.length||!studentIds.length)return NextResponse.json({students:[],leaderboard:[],activityCount:0,goals:[],achievements:[],estimated:true});
 const {data:c}=await db.from('courses').select('id').in('class_id',classIds);const cids=(c||[]).map(x=>x.id);
 const {data:u}=cids.length?await db.from('course_units').select('id').in('course_id',cids):{data:[]};const uids=(u||[]).map(x=>x.id);
 const {data:l}=uids.length?await db.from('lessons').select('id').in('unit_id',uids):{data:[]};const lids=(l||[]).map(x=>x.id);
 const {data:a}=lids.length?await db.from('lesson_activities').select('id,skill').in('lesson_id',lids):{data:[]};const aids=(a||[]).map(x=>x.id);
 if(aids.length>500||studentIds.length>300)return fail('Report too large',413);
 const {data:raw,error:ae}=aids.length?await db.from('activity_attempts').select('student_id,activity_id,score,max_score,teacher_band,submitted_at').in('activity_id',aids).in('student_id',studentIds).neq('status','draft').limit(10001):{data:[],error:null};if(ae)throw ae;if((raw||[]).length>10000)return fail('Report too large',413);
 const attempts=(raw||[]) as Attempt[];const {data:profiles}=await db.from('profiles').select('id,display_name').in('id',studentIds);
 const nameMap=new Map((profiles||[]).map(p=>[p.id,p.display_name]));const skillMap=new Map((a||[]).map(x=>[x.id,x.skill]));
 const rows=studentIds.map(id=>{const own=attempts.filter(t=>t.student_id===id);const bySkill=skills.map(skill=>{const relevant=own.filter(t=>skillMap.get(t.activity_id)===skill);const best=new Map<string,number>();for(const t of relevant){const v=skill==='writing'||skill==='speaking'?t.teacher_band:percent(t);if(v!==null)best.set(t.activity_id,Math.max(v,best.get(t.activity_id)??-1))}const vals=[...best.values()];const average=vals.length?vals.reduce((x,y)=>x+y,0)/vals.length:null;return {skill,completed:new Set(relevant.map(t=>t.activity_id)).size,attempts:relevant.length,average,estimatedBand:average===null?null:skill==='reading'||skill==='listening'?band(average):skill==='writing'||skill==='speaking'?Math.round(average*2)/2:null}});return {id,name:nameMap.get(id)||'Student',completed:new Set(own.map(t=>t.activity_id)).size,totalAttempts:own.length,skills:bySkill,improvement:0}});
 const period=body.period==='monthly'?'monthly':'weekly';const start=new Date();if(period==='monthly')start.setUTCDate(1);else start.setUTCDate(start.getUTCDate()-(start.getUTCDay()+6)%7);start.setUTCHours(0,0,0,0);
 const leaderboard=rows.map(r=>({...r,periodCompleted:new Set(attempts.filter(t=>t.student_id===r.id&&t.submitted_at&&Date.parse(t.submitted_at)>=start.getTime()).map(t=>t.activity_id)).size})).sort((x,y)=>y.periodCompleted-x.periodCompleted||y.completed-x.completed||x.name.localeCompare(y.name)).slice(0,10);
 const {data:goals}=!teacher?await db.from('student_band_goals').select('skill,target_band').eq('student_id',user.id):{data:[]};const me=rows.find(r=>r.id===user.id);
 const achievements=me?[{name:'First Step',unlocked:me.completed>=1},{name:'Practice Explorer',unlocked:me.completed>=5},{name:'Dedicated Learner',unlocked:me.completed>=20},{name:'Four Skills',unlocked:['reading','listening','writing','speaking'].every(s=>me.skills.some(k=>k.skill===s&&k.completed>0))}]:[];
 return NextResponse.json({students:teacher?rows:rows.filter(r=>r.id===user.id),leaderboard,activityCount:aids.length,goals:goals||[],achievements,period,estimated:true});
 }catch(e){console.error('Progress report',e);return fail('Unable to load progress',500)}}
