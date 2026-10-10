import {NextRequest,NextResponse} from 'next/server';
import {adminDb,serverDb} from '@/lib/supabase-server';
export const runtime='nodejs';
export const maxDuration=60;
const error=(message:string,status=400)=>NextResponse.json({error:message},{status});
const envLimit=(key:string,def:number,max:number)=>{const n=Number(process.env[key]||def);return Number.isInteger(n)?Math.max(0,Math.min(n,max)):def};
const API='https://api.openai.com/v1';
async function openai(path:string,body:BodyInit,contentType?:string){
 const headers:Record<string,string>={Authorization:`Bearer ${process.env.OPENAI_API_KEY}`};
 if(contentType)headers['Content-Type']=contentType;
 const response=await fetch(API+path,{method:'POST',headers,body,signal:AbortSignal.timeout(48000)});
 if(!response.ok){const t=await response.text();throw new Error(`AI provider error (${response.status}): ${t.slice(0,160)}`)}
 return response.json();
}
const rubric={type:'object',additionalProperties:false,required:['estimated_band','criteria','strengths','improvements','corrections','model_suggestions','disclaimer'],properties:{
 estimated_band:{type:'number'},criteria:{type:'array',items:{type:'object',additionalProperties:false,required:['name','band','comment'],properties:{name:{type:'string'},band:{type:'number'},comment:{type:'string'}}}},
 strengths:{type:'array',items:{type:'string'}},improvements:{type:'array',items:{type:'string'}},corrections:{type:'array',items:{type:'object',additionalProperties:false,required:['original','improved','reason'],properties:{original:{type:'string'},improved:{type:'string'},reason:{type:'string'}}}},
 model_suggestions:{type:'string'},disclaimer:{type:'string'}
}};
export async function POST(req:NextRequest){
 if(process.env.AI_GRADING_ENABLED!=='true')return error('Giáo viên chưa bật tính năng AI.',503);
 if(!process.env.OPENAI_API_KEY)return error('Chưa cấu hình OPENAI_API_KEY trên máy chủ.',503);
 const {data:{user}}=await (await serverDb()).auth.getUser();if(!user)return error('Cần đăng nhập',401);
 let workId:string;try{const body=await req.json();workId=String(body.workId||'');if(!/^[0-9a-f-]{36}$/i.test(workId))return error('Mã bài không hợp lệ');}catch{return error('Dữ liệu không hợp lệ')}
 const db=adminDb();const {data:work}=await db.from('skill_work').select('*').eq('id',workId).eq('student_id',user.id).maybeSingle();
 if(!work)return error('Không tìm thấy bài nộp của bạn',404);
 const {data:member}=await db.from('enrollments').select('student_id').eq('class_id',work.class_id).eq('student_id',user.id).maybeSingle();if(!member)return error('Không thuộc lớp',403);
 if(work.skill==='writing'&&work.content.trim().split(/\s+/).length<40)return error('Bài Writing cần ít nhất 40 từ để AI có thể đánh giá');
 if(work.skill==='speaking'&&!work.audio_path)return error('Speaking cần có bản ghi âm để chấm phát âm');
 const weekly=envLimit(work.skill==='writing'?'AI_WRITING_WEEKLY_LIMIT':'AI_SPEAKING_WEEKLY_LIMIT',work.skill==='writing'?2:1,20);
 const monthly=envLimit('AI_CLASS_MONTHLY_LIMIT',100,500);
 const {data:claim,error:claimError}=await db.rpc('claim_ai_grade',{p_work:work.id,p_student:user.id,p_class:work.class_id,p_skill:work.skill,p_week_limit:weekly,p_month_limit:monthly});
 if(claimError)return error('Cần chạy supabase/ai_v2.sql: '+claimError.message,503);
 if(claim==='weekly_limit')return error(`Đã hết ${weekly} lượt chấm ${work.skill} trong tuần`,429);
 if(claim==='monthly_limit')return error('Lớp đã đạt giới hạn chấm AI trong tháng',429);
 if(claim==='processing')return error('Bài đang được AI xử lý, vui lòng chờ',409);
 if(claim==='completed'){const {data:g}=await db.from('ai_grades').select('feedback,transcript').eq('work_id',work.id).single();return NextResponse.json({ok:true,feedback:g?.feedback,transcript:g?.transcript,cached:true})}
 let transcript='';
 try{
  if(work.skill==='speaking'){
   const {data:audio,error:downloadError}=await db.storage.from('ielts-media').download(work.audio_path);
   if(downloadError||!audio)throw new Error('Không đọc được file ghi âm');
   if(audio.size>15*1024*1024)throw new Error('Audio vượt quá 15MB');
   const fd=new FormData();fd.append('file',audio,'speaking.webm');fd.append('model',process.env.OPENAI_TRANSCRIBE_MODEL||'gpt-4o-mini-transcribe');
   const t=await openai('/audio/transcriptions',fd);transcript=String(t.text||'').slice(0,14000);
   if(!transcript.trim())throw new Error('Không nhận diện được lời nói');
  }
  const skill=work.skill;
  const names=skill==='writing'?['Task Achievement / Task Response','Coherence and Cohesion','Lexical Resource','Grammatical Range and Accuracy']:['Fluency and Coherence','Lexical Resource','Grammatical Range and Accuracy','Pronunciation'];
  const system=`You are an IELTS practice coach for a high school learner. Return concise, constructive Vietnamese feedback with English examples. Evaluate ${skill} Part/Task ${work.part} using exactly four IELTS rubric criteria: ${names.join('; ')}. Each band is a provisional half-band from 0 to 9. Give specific, evidence-based corrections, avoid fabricated quotations, and never claim official IELTS certification. ${skill==='speaking'?'You only have a transcript, not acoustic analysis. Pronunciation cannot be reliably assessed from transcript; set Pronunciation band to 0 and explicitly explain it is NOT SCORED. Estimated overall band should be null? Schema requires number: use 0 to indicate overall is unavailable due to missing acoustic evidence, and provide useful qualitative feedback for other criteria.':'If the writing prompt is missing, state that Task Response cannot be reliably determined and avoid overconfidence.'} Include a disclaimer in Vietnamese. No personal data.`;
  const input=skill==='writing'?`Student Writing Task ${work.part}:\n${String(work.content).slice(0,14000)}`:`Student Speaking Part ${work.part} transcript (auto-generated; may have recognition errors):\n${transcript}\nStudent notes: ${String(work.content||'').slice(0,1000)}`;
  const completion=await openai('/chat/completions',JSON.stringify({model:process.env.OPENAI_GRADING_MODEL||'gpt-4.1-mini',temperature:0.2,max_tokens:1900,response_format:{type:'json_schema',json_schema:{name:'ielts_feedback',strict:true,schema:rubric}},messages:[{role:'system',content:system},{role:'user',content:input}]}),'application/json');
  const raw=completion.choices?.[0]?.message?.content;if(typeof raw!=='string')throw new Error('AI không trả về đánh giá');
  const feedback=JSON.parse(raw);
  const {error:saveError}=await db.from('ai_grades').update({status:'completed',feedback,transcript,updated_at:new Date().toISOString()}).eq('work_id',work.id);
  if(saveError)throw saveError;
  return NextResponse.json({ok:true,feedback,transcript});
 }catch(e:any){console.error('AI grading failed',e);await db.from('ai_grades').update({status:'failed',error_message:String(e?.message||'AI error').slice(0,250),updated_at:new Date().toISOString()}).eq('work_id',work.id);return error('Chấm AI chưa thành công. Có thể thử lại sau. '+String(e?.message||'').slice(0,80),502)}
}
