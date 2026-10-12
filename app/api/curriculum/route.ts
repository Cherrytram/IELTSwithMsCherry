import {NextRequest,NextResponse} from 'next/server';
import {adminDb,serverDb} from '@/lib/supabase-server';

export const runtime='nodejs';
type Level='course'|'unit'|'lesson'|'activity';
const tables:Record<Level,string>={course:'courses',unit:'course_units',lesson:'lessons',activity:'lesson_activities'};
const parentField:Record<Level,string>={course:'class_id',unit:'course_id',lesson:'unit_id',activity:'lesson_id'};
const bad=(error:string,status=400)=>NextResponse.json({error},{status});
const clean=(v:unknown,max=160)=>typeof v==='string'?v.trim().slice(0,max):'';
const uuid=(v:unknown)=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const levels=['course','unit','lesson','activity'];

export async function POST(req:NextRequest){
 try {
  const {data:{user}}=await (await serverDb()).auth.getUser();
  if(!user)return bad('Please log in',401);
  const db=adminDb();
  const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).maybeSingle();
  if(!profile)return bad('Account profile missing',403);
  const body=await req.json();
  const operation=clean(body.operation,20);
  const level=clean(body.level,20) as Level;
  if(!levels.includes(level))return bad('Invalid level');
  if(!['list','create','update','delete'].includes(operation))return bad('Invalid operation');
  const isTeacher=profile.role==='teacher';
  if(operation!=='list'&&!isTeacher)return bad('Teacher access required',403);
  const classId=clean(body.classId,40);
  if(!uuid(classId))return bad('Invalid class ID');
  const {data:cls}=await db.from('classes').select('id,teacher_id').eq('id',classId).maybeSingle();
  if(!cls)return bad('Class not found',404);
  if(isTeacher){if(cls.teacher_id!==user.id)return bad('Not your class',403)}
  else {
   const {data:enrollment}=await db.from('enrollments').select('student_id').eq('class_id',classId).eq('student_id',user.id).maybeSingle();
   if(!enrollment)return bad('Not enrolled in class',403);
  }
  // Resolve ancestry for every nested resource, preventing cross-class writes.
  async function belongs(target:Level,id:string):Promise<boolean>{
   if(!uuid(id))return false;
   if(target==='course'){
    const {data}=await db.from('courses').select('class_id').eq('id',id).maybeSingle();return data?.class_id===classId;
   }
   if(target==='unit'){
    const {data}=await db.from('course_units').select('course_id').eq('id',id).maybeSingle();return !!data&&await belongs('course',data.course_id);
   }
   if(target==='lesson'){
    const {data}=await db.from('lessons').select('unit_id').eq('id',id).maybeSingle();return !!data&&await belongs('unit',data.unit_id);
   }
   const {data}=await db.from('lesson_activities').select('lesson_id').eq('id',id).maybeSingle();return !!data&&await belongs('lesson',data.lesson_id);
  }
  if(operation==='list'){
   // Read each level with explicit scoped IDs; never expose draft content to students.
   const {data:allCourses,error:ce}=await db.from('courses').select('*').eq('class_id',classId).order('position').order('created_at');
   if(ce)throw ce;
   const courses=(allCourses||[]).filter(c=>isTeacher||c.published);
   const courseIds=courses.map(c=>c.id);
   const {data:allUnits,error:ue}=courseIds.length?await db.from('course_units').select('*').in('course_id',courseIds).order('position').order('created_at'):{data:[],error:null};
   if(ue)throw ue;
   const units=(allUnits||[]).filter(u=>isTeacher||u.published);
   const unitIds=units.map(u=>u.id);
   const {data:allLessons,error:le}=unitIds.length?await db.from('lessons').select('*').in('unit_id',unitIds).order('position').order('created_at'):{data:[],error:null};
   if(le)throw le;
   const lessons=(allLessons||[]).filter(l=>isTeacher||l.published);
   const lessonIds=lessons.map(l=>l.id);
   const {data:allActivities,error:ae}=lessonIds.length?await db.from('lesson_activities').select('*').in('lesson_id',lessonIds).order('position').order('created_at'):{data:[],error:null};
   if(ae)throw ae;
   const activities=(allActivities||[]).filter(a=>isTeacher||a.published).map(a=>isTeacher?a:{...a,content:safeContent(a.content)});
   return NextResponse.json({courses,units,lessons,activities});
  }
  const table=tables[level];
  if(operation==='create'){
   const title=clean(body.title);if(!title)return bad('Title required');
   const parent=clean(body.parentId,40);
   const prev=levels[levels.indexOf(level)-1] as Level|undefined;
   if(level!=='course'&&(!prev||!await belongs(prev,parent)))return bad('Invalid parent',403);
   const position=Number.isInteger(body.position)&&body.position>=0&&body.position<=100000?body.position:0;
   const payload:Record<string,unknown>={[parentField[level]]:level==='course'?classId:parent,title,position,description:clean(body.description,2000),published:false};
   if(level==='activity'){
    if(!['reading','listening','writing','speaking','vocabulary'].includes(body.skill))return bad('Invalid skill');
    if(!['theory','practice','exam','assignment'].includes(body.kind))return bad('Invalid activity kind');
    payload.skill=body.skill;payload.kind=body.kind;payload.content={};delete payload.description;
   }
   const {data,error}=await db.from(table).insert(payload).select('*').single();if(error)throw error;
   return NextResponse.json({item:data});
  }
  const id=clean(body.id,40);if(!await belongs(level,id))return bad('Item not found in your class',404);
  if(operation==='delete'){
   const {error}=await db.from(table).delete().eq('id',id);if(error)throw error;
   return NextResponse.json({ok:true});
  }
  const changes:Record<string,unknown>={updated_at:new Date().toISOString()};
  if(body.title!==undefined){const title=clean(body.title);if(!title)return bad('Title required');changes.title=title}
  if(body.description!==undefined&&level!=='activity')changes.description=clean(body.description,2000);
  if(typeof body.published==='boolean')changes.published=body.published;
  if(Number.isInteger(body.position)&&body.position>=0&&body.position<=100000)changes.position=body.position;
  if(level==='activity'){
   if(body.skill!==undefined){if(!['reading','listening','writing','speaking','vocabulary'].includes(body.skill))return bad('Invalid skill');changes.skill=body.skill}
   if(body.kind!==undefined){if(!['theory','practice','exam','assignment'].includes(body.kind))return bad('Invalid kind');changes.kind=body.kind}
   if(body.content!==undefined){
    if(!body.content||typeof body.content!=='object'||Array.isArray(body.content)||JSON.stringify(body.content).length>100000)return bad('Invalid content');
    changes.content=body.content;
   }
  }
  const {data,error}=await db.from(table).update(changes).eq('id',id).select('*').single();if(error)throw error;
  return NextResponse.json({item:data});
 }catch(err){console.error('Curriculum error',err);return bad('Unable to process curriculum request',500)}
}
// Student payload must not reveal answer keys embedded in draft question JSON.
function safeContent(content:unknown):unknown{
 if(Array.isArray(content))return content.map(safeContent);
 if(content&&typeof content==='object')return Object.fromEntries(Object.entries(content).filter(([k])=>!['correct','correctAnswer','answerKey','alternatives','grading','explanation','evidence'].includes(k)).map(([k,v])=>[k,safeContent(v)]));
 return content;
}
