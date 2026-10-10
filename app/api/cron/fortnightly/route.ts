import {NextRequest,NextResponse} from 'next/server';import {adminDb} from '@/lib/supabase';
export const runtime='nodejs';
export async function GET(req:NextRequest){
 const secret=process.env.CRON_SECRET;
 if(!secret||req.headers.get('authorization')!==`Bearer ${secret}`)return NextResponse.json({error:'Unauthorized'},{status:401});
 if(!process.env.RESEND_API_KEY||!process.env.REPORT_FROM_EMAIL||!process.env.REPORT_TO_EMAIL)return NextResponse.json({error:'Email settings missing'},{status:503});
 const db=adminDb();const {data:classes,error}=await db.from('classes').select('id,name,code,created_at');if(error)return NextResponse.json({error:error.message},{status:500});
 const now=new Date();let sent=0;let skipped=0;const errors:string[]=[];
 for(const cls of classes||[]){
  const origin=new Date(cls.created_at);const days=Math.floor((now.getTime()-origin.getTime())/86400000);
  if(days<14||days%14!==0){skipped++;continue}
  const end=now.toISOString().slice(0,10);const start=new Date(now.getTime()-14*86400000).toISOString().slice(0,10);
  const {data:already}=await db.from('report_runs').select('id').eq('class_id',cls.id).eq('period_end',end).maybeSingle();if(already){skipped++;continue}
  const {data:enroll}=await db.from('enrollments').select('student_id,student_code').eq('class_id',cls.id);
  const ids=(enroll||[]).map(e=>e.student_id);const {data:subs}=ids.length?await db.from('submissions').select('student_id,stage,correct,total,created_at').in('student_id',ids).gte('created_at',start).lt('created_at',new Date(now.getTime()+86400000).toISOString()):{data:[]};
  const lines=(enroll||[]).map(e=>{const records=(subs||[]).filter(s=>s.student_id===e.student_id);const exam=records.filter(s=>s.stage==='exam');return `${e.student_code}: ${exam.length} Cambridge submissions; ${records.length} total submissions; best ${Math.max(0,...exam.map(x=>x.correct))} correct`});
  const body=`IELTS Fashion Academy — 14-day class report\nClass: ${cls.name} (${cls.code})\nPeriod: ${start} – ${end}\nStudents: ${(enroll||[]).length}\n\n${lines.join('\n')||'No students'}\n`;
  try{
   const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.REPORT_FROM_EMAIL,to:[process.env.REPORT_TO_EMAIL],subject:`IELTS 14-day report: ${cls.name}`,text:body})});if(!response.ok)throw new Error(`Email provider: ${response.status}`);
   const {error:logError}=await db.from('report_runs').insert({class_id:cls.id,period_start:start,period_end:end});if(logError)throw logError;sent++;
  }catch(e:any){errors.push(`${cls.code}: ${e.message}`)}
 }
 return NextResponse.json({sent,skipped,errors});
}
