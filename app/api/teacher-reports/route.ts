import {NextRequest,NextResponse} from 'next/server';
import {adminDb,serverDb} from '@/lib/supabase-server';
export const runtime='nodejs';
const idOk=(x:unknown)=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(x);
const err=(message:string,status=400)=>NextResponse.json({error:message},{status});
type Attempt={student_id:string;activity_id:string;submitted_at:string|null;score:number|null;max_score:number|null;teacher_band:number|null;status:string};
function csvCell(x:unknown){let v=String(x??'');if(/^[\s]*[=+@\-\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'}
export async function POST(req:NextRequest){try{
 const auth=await serverDb();const {data:{user}}=await auth.auth.getUser();if(!user)return err('Sign in required',401);
 const body=await req.json();if(!idOk(body.classId))return err('Invalid class');
 const db=adminDb();const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).maybeSingle();if(profile?.role!=='teacher')return err('Teacher access required',403);
 const {data:cls,error:ce}=await db.from('classes').select('id,name,code').eq('id',body.classId).eq('teacher_id',user.id).maybeSingle();if(ce)throw ce;if(!cls)return err('Class not found',403);
 const [{data:en,error:ee},{data:hw,error:he}]=await Promise.all([
  db.from('enrollments').select('student_id,student_code,archived').eq('class_id',cls.id),
  db.from('homework_assignments').select('id,activity_id,student_id,title,due_at,created_at').eq('class_id',cls.id).order('due_at',{ascending:false})
 ]);if(ee)throw ee;if(he)throw he;
 const students=(en||[]).filter(s=>!s.archived);const assignments=hw||[];
 if(students.length>500||assignments.length>500)return err('Report exceeds 500 students or assignments',413);
 const ids=[...new Set(students.map(s=>s.student_id))];const aids=[...new Set(assignments.map(a=>a.activity_id))];
 const [{data:profiles,error:pe},{data:attempts,error:ae}]=await Promise.all([
  ids.length?db.from('profiles').select('id,display_name').in('id',ids):Promise.resolve({data:[],error:null}),
  aids.length&&ids.length?db.from('activity_attempts').select('student_id,activity_id,submitted_at,score,max_score,teacher_band,status').in('student_id',ids).in('activity_id',aids).neq('status','draft').limit(10001):Promise.resolve({data:[],error:null})
 ]);if(pe)throw pe;if(ae)throw ae;if((attempts||[]).length>10000)return err('Report exceeds 10,000 attempts; narrow your class',413);
 const names=new Map((profiles||[]).map(p=>[p.id,p.display_name]));
 const rows=[] as Array<{studentCode:string;studentName:string;assignment:string;dueAt:string;submittedAt:string;status:string;score:string;band:string;attemptCount:number}>;
 const now=Date.now();
 for(const a of assignments){for(const s of students){if(a.student_id&&a.student_id!==s.student_id)continue;
  const own=((attempts||[]) as Attempt[]).filter(t=>t.student_id===s.student_id&&t.activity_id===a.activity_id&&t.submitted_at&&Date.parse(t.submitted_at)>=Date.parse(a.created_at)).sort((x,y)=>Date.parse(x.submitted_at!)-Date.parse(y.submitted_at!));
  // Earliest submitted attempt determines on-time status; later retakes do not change it.
  const first=own[0];const best=own.filter(t=>t.max_score&&t.max_score>0&&t.score!==null).sort((x,y)=>(y.score!/y.max_score!)-(x.score!/x.max_score!))[0];
  const latestGraded=[...own].reverse().find(t=>t.teacher_band!==null);
  const status=first?(Date.parse(first.submitted_at!)>Date.parse(a.due_at)?'Late':'On time'):(Date.parse(a.due_at)<now?'Overdue':'Pending');
  rows.push({studentCode:s.student_code||'',studentName:names.get(s.student_id)||'',assignment:a.title,dueAt:a.due_at,submittedAt:first?.submitted_at||'',status,score:best?`${best.score}/${best.max_score}`:'',band:latestGraded?.teacher_band===null||!latestGraded?'':String(latestGraded.teacher_band),attemptCount:own.length});
 }}
 const summary={students:students.length,assignments:assignments.length,expected:rows.length,onTime:rows.filter(r=>r.status==='On time').length,late:rows.filter(r=>r.status==='Late').length,overdue:rows.filter(r=>r.status==='Overdue').length,pending:rows.filter(r=>r.status==='Pending').length};
 if(body.format==='csv'){
  const columns=['Student code','Student name','Homework','Deadline (ISO)','First submission (ISO)','Status','Best score','Teacher band','Attempts'];
  const content='\uFEFF'+[columns,...rows.map(r=>[r.studentCode,r.studentName,r.assignment,r.dueAt,r.submittedAt,r.status,r.score,r.band,r.attemptCount])].map(r=>r.map(csvCell).join(',')).join('\r\n');
  return new NextResponse(content,{headers:{'Content-Type':'text/csv; charset=utf-8','Content-Disposition':'attachment; filename="ielts-homework-report.csv"','Cache-Control':'no-store'}});
 }
 return NextResponse.json({class:cls,rows,summary,generatedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
 }catch(e){console.error('Teacher reports',e);return err('Unable to generate report',500)}}
