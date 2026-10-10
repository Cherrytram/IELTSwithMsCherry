import {NextRequest,NextResponse} from 'next/server';
import {adminDb,serverDb} from '@/lib/supabase-server';
import {studentEmail} from '@/lib/supabase';
import {coins,score,Question} from '@/lib/quiz';
export const runtime='nodejs';
const fail=(msg:string,status=400)=>NextResponse.json({error:msg},{status});
const str=(x:unknown,max=10000)=>typeof x==='string'?x.slice(0,max):'';
const integer=(x:unknown,min:number,max:number)=>{const n=Number(x);if(!Number.isInteger(n)||n<min||n>max)throw new Error('Giá trị không hợp lệ');return n};
const validQuestions=(v:unknown):v is Question[]=>Array.isArray(v)&&v.length<=60&&v.every(q=>q&&typeof q.id==='string'&&typeof q.prompt==='string'&&q.prompt.length<=5000&&['mcq','fill','dropdown'].includes(q.type)&&Array.isArray(q.options)&&q.options.length<=12&&q.options.every((x:unknown)=>typeof x==='string')&&typeof q.correct==='string'&&q.correct.length<=500&&(!q.alternatives||Array.isArray(q.alternatives)));
export async function POST(req:NextRequest){
 try{
  const body=await req.json();const action=str(body.action,50);
  const auth=await serverDb();const {data:{user}}=await auth.auth.getUser();if(!user)return fail('Vui lòng đăng nhập',401);
  const db=adminDb();const {data:profile}=await db.from('profiles').select('*').eq('id',user.id).single();if(!profile)return fail('Chưa có hồ sơ. Hãy xác nhận email giáo viên hoặc liên hệ quản trị.',403);
  const teacher=profile.role==='teacher';const student=profile.role==='student';
  const ownClass=async(id:string)=>{const {data}=await db.from('classes').select('*').eq('id',id).eq('teacher_id',user.id).single();if(!data)throw new Error('Bạn không quản lý lớp này');return data};
  const myEnrollment=async(id:string)=>{const {data}=await db.from('enrollments').select('*').eq('class_id',id).eq('student_id',user.id).single();if(!data)throw new Error('Bạn chưa tham gia lớp');return data};
  const getUnit=async(id:string)=>{const {data}=await db.from('content_units').select('*').eq('id',id).single();if(!data)throw new Error('Không tìm thấy bài');if(teacher)await ownClass(data.class_id);else {await myEnrollment(data.class_id);if(!data.published)throw new Error('Giáo viên chưa xuất bản bài')}return data};
  if(action==='bootstrap'){
   const {data:classes}=teacher?await db.from('classes').select('*').eq('teacher_id',user.id).order('created_at'):await db.from('enrollments').select('class_id,classes(*)').eq('student_id',user.id);
   const cls=teacher?(classes||[]):(classes||[]).map((e:any)=>e.classes).filter(Boolean);
   const ids=cls.map((c:any)=>c.id);
   const {data:units}=ids.length?await db.from('content_units').select('*').in('class_id',ids).order('part'): {data:[]};
   const visible=teacher?(units||[]):(units||[]).filter((u:any)=>u.published).map((u:any)=>({...u,mini_questions:(u.mini_questions||[]).map(({correct,alternatives,explanation,...q}:any)=>q),exam_questions:(u.exam_questions||[]).map(({correct,alternatives,explanation,...q}:any)=>q)}));
   const {data:progress}=student?await db.from('progress').select('*').eq('student_id',user.id):{data:[]};
   const {data:wallet}=student?await db.from('wallets').select('*').eq('student_id',user.id).maybeSingle():{data:null};
   const {data:items}=await db.from('shop_items').select('*').order('price');
   const {data:inventory}=student?await db.from('inventory').select('*').eq('student_id',user.id):{data:[]};
   const {data:equipped}=student?await db.from('equipped').select('*').eq('student_id',user.id):{data:[]};
   const {data:avatar}=student?await db.from('avatar_settings').select('*').eq('student_id',user.id).maybeSingle():{data:null};
   const {data:work}=student?await db.from('skill_work').select('*').eq('student_id',user.id).order('created_at',{ascending:false}).limit(40):{data:[]};
   const {data:aiGrades}=student?await db.from('ai_grades').select('work_id,status,feedback,transcript').eq('student_id',user.id):{data:[]};
   return NextResponse.json({profile,classes:cls,units:visible,progress:progress||[],wallet:wallet?.balance||0,items:items||[],inventory:inventory||[],equipped:equipped||[],avatar:avatar?.style||'girl',work:work||[],aiGrades:aiGrades||[]});
  }
  if(action==='create_class'){
   if(!teacher)return fail('Chỉ giáo viên');const code=str(body.code,30).trim().toUpperCase();if(!/^[A-Z0-9_-]{3,30}$/.test(code))return fail('Mã lớp không hợp lệ');
   const {error}=await db.from('classes').insert({teacher_id:user.id,code,name:str(body.name,100)});if(error)throw error;return NextResponse.json({ok:true});
  }
  if(action==='add_student'){
   if(!teacher)return fail('Chỉ giáo viên');const cls=await ownClass(str(body.classId));const code=str(body.studentCode,30).trim().toUpperCase();const pin=str(body.pin,72);if(pin.length<8)return fail('PIN/mật khẩu phải có ít nhất 8 ký tự');
   const email=studentEmail(cls.code,code);
   const {data:created,error}=await db.auth.admin.createUser({email,password:pin,email_confirm:true,user_metadata:{role:'student'}});if(error)throw error;
   const sid=created.user.id;
   try{
    const {error:e1}=await db.from('profiles').insert({id:sid,role:'student',display_name:str(body.name,100)||code});if(e1)throw e1;
    const {error:e2}=await db.from('enrollments').insert({class_id:cls.id,student_id:sid,student_code:code});if(e2)throw e2;
    await db.from('wallets').insert({student_id:sid,balance:0});await db.from('avatar_settings').insert({student_id:sid,style:'girl'});
   }catch(e){await db.auth.admin.deleteUser(sid);throw e}
   return NextResponse.json({ok:true,studentCode:code});
  }
  if(action==='class_progress'){
   if(!teacher)return fail('Chỉ giáo viên');const cls=await ownClass(str(body.classId));
   const {data:enroll}=await db.from('enrollments').select('student_id,student_code,profiles(display_name)').eq('class_id',cls.id);
   const ids=(enroll||[]).map(e=>e.student_id);const {data:progress}=ids.length?await db.from('progress').select('*,content_units(skill,book,test,part)').in('student_id',ids):{data:[]};
   const {data:works}=ids.length?await db.from('skill_work').select('id,student_id,skill,part,content,audio_path,created_at,teacher_feedback,submission_mode,submission_status').in('student_id',ids).eq('class_id',cls.id):{data:[]};
   const {data:aiGrades}=await db.from('ai_grades').select('work_id,status,feedback,transcript').eq('class_id',cls.id);return NextResponse.json({students:enroll||[],progress:progress||[],works:works||[],aiGrades:aiGrades||[]});
  }
  if(action==='feedback_work'){
   if(!teacher)return fail('Chỉ giáo viên');const id=str(body.workId);const {data:work}=await db.from('skill_work').select('class_id').eq('id',id).single();if(!work)throw new Error('Không tìm thấy bài nộp');await ownClass(work.class_id);
   const {error}=await db.from('skill_work').update({teacher_feedback:str(body.feedback,5000)}).eq('id',id);if(error)throw error;return NextResponse.json({ok:true});
  }
  if(action==='save_unit'){
   if(!teacher)return fail('Chỉ giáo viên');await ownClass(str(body.classId));
   const skill=str(body.skill);if(!['listening','reading'].includes(skill))return fail('Kỹ năng không hợp lệ');
   const book=integer(body.book,16,21),test=integer(body.test,1,4),part=integer(body.part,1,skill==='reading'?3:4);
   if(!validQuestions(body.miniQuestions)||!validQuestions(body.examQuestions))return fail('Câu hỏi không hợp lệ');
   const payload={class_id:body.classId,skill,book,test,part,theory:str(body.theory,30000),source_text:str(body.sourceText,50000),mini_questions:body.miniQuestions,exam_questions:body.examQuestions,audio_path:str(body.audioPath,400)||null,image_path:str(body.imagePath,400)||null,published:!!body.published,updated_at:new Date().toISOString()};
   const {error}=await db.from('content_units').upsert(payload,{onConflict:'class_id,skill,book,test,part'});if(error)throw error;return NextResponse.json({ok:true});
  }
  if(action==='complete_theory'){
   if(!student)return fail('Chỉ học sinh');const unit=await getUnit(str(body.unitId));
   if(unit.part>1){const {data:prev}=await db.from('content_units').select('id').eq('class_id',unit.class_id).eq('skill',unit.skill).eq('book',unit.book).eq('test',unit.test).eq('part',unit.part-1).maybeSingle();const {data:pp}=prev?await db.from('progress').select('exam_completed').eq('unit_id',prev.id).eq('student_id',user.id).maybeSingle():{data:null};if(!pp?.exam_completed)throw new Error('Chưa hoàn thành phần trước')}
   const {error}=await db.from('progress').upsert({student_id:user.id,unit_id:unit.id,theory_completed:true},{onConflict:'student_id,unit_id'});if(error)throw error;return NextResponse.json({ok:true});
  }
  if(action==='submit'){
   if(!student)return fail('Chỉ học sinh');const unit=await getUnit(str(body.unitId));const stage=str(body.stage);if(!['mini','exam'].includes(stage))return fail('Bước không hợp lệ');
   const {data:all}=await db.from('content_units').select('id,part,published').eq('class_id',unit.class_id).eq('skill',unit.skill).eq('book',unit.book).eq('test',unit.test).order('part');
   if(unit.part>1){const prev=all?.find(u=>u.part===unit.part-1);if(!prev?.published)throw new Error('Phần trước chưa được giáo viên xuất bản');const {data:p}=await db.from('progress').select('exam_completed').eq('student_id',user.id).eq('unit_id',prev.id).maybeSingle();if(!p?.exam_completed)throw new Error('Cần hoàn thành phần trước')}
   const {data:old}=await db.from('progress').select('*').eq('student_id',user.id).eq('unit_id',unit.id).maybeSingle();
   if(!old?.theory_completed)throw new Error('Hãy hoàn thành Theory trước');
   if(stage==='exam'&&!old?.mini_passed)throw new Error('Hãy hoàn thành Mini Test trước');
   const qs:Question[]=stage==='mini'?unit.mini_questions:unit.exam_questions;
   if(!qs.length)throw new Error('Giáo viên chưa nhập câu hỏi');
   const answers=body.answers;if(!answers||typeof answers!=='object'||Array.isArray(answers))return fail('Đáp án không hợp lệ');
   const grading=score(qs,answers);const correct=grading.filter(g=>g.correct).length;
   // An 80% mini-test pass threshold. Teacher may customize in a later version.
   const miniPassed=stage==='mini'&&correct/qs.length>=.8;
   const reward=stage==='exam'?coins(correct,qs.length):0;
   const {error:subError}=await db.from('submissions').insert({student_id:user.id,unit_id:unit.id,stage,answers,grading,correct,total:qs.length});if(subError)throw subError;
   let delta=0;
   if(stage==='mini'){
    const {error:prError}=await db.from('progress').upsert({student_id:user.id,unit_id:unit.id,mini_passed:!!old?.mini_passed||miniPassed,theory_completed:true,exam_completed:!!old?.exam_completed,best_score:old?.best_score||0,best_reward:old?.best_reward||0,updated_at:new Date().toISOString()},{onConflict:'student_id,unit_id'});if(prError)throw prError;
   }else{
    const {data:awarded,error:awardError}=await db.rpc('apply_exam_reward',{p_student:user.id,p_unit:unit.id,p_reward:reward,p_correct:correct});if(awardError)throw awardError;delta=awarded||0;
   }
   return NextResponse.json({ok:true,correct,total:qs.length,grading,miniPassed:!!old?.mini_passed||miniPassed,earned:delta});
  }
  if(action==='purchase'){
   if(!student)return fail('Chỉ học sinh');const {data:item}=await db.from('shop_items').select('*').eq('id',str(body.itemId)).single();if(!item)return fail('Không có vật phẩm');
   const {data:already}=await db.from('inventory').select('item_id').eq('student_id',user.id).eq('item_id',item.id).maybeSingle();if(already)return fail('Đã sở hữu');
   const {error:purchaseError}=await db.rpc('buy_shop_item',{p_student:user.id,p_item:item.id});if(purchaseError)throw purchaseError;
   return NextResponse.json({ok:true});
  }
  if(action==='equip'){
   if(!student)return fail('Chỉ học sinh');const {data:own}=await db.from('inventory').select('item_id').eq('student_id',user.id).eq('item_id',str(body.itemId)).maybeSingle();if(!own)return fail('Chưa sở hữu');
   const {data:item}=await db.from('shop_items').select('slot').eq('id',str(body.itemId)).single();if(!item)return fail('Không tìm thấy');
   const {error}=await db.from('equipped').upsert({student_id:user.id,slot:item.slot,item_id:body.itemId},{onConflict:'student_id,slot'});if(error)throw error;return NextResponse.json({ok:true});
  }
  if(action==='avatar'){
   if(!student)return fail('Chỉ học sinh');if(!['boy','girl'].includes(body.style))return fail('Lựa chọn không hợp lệ');
   const {error}=await db.from('avatar_settings').upsert({student_id:user.id,style:body.style});if(error)throw error;return NextResponse.json({ok:true});
  }
  if(action==='save_work'){
   if(!student)return fail('Chỉ học sinh');await myEnrollment(str(body.classId));const skill=str(body.skill);if(!['writing','speaking'].includes(skill))return fail('Kỹ năng không hợp lệ');
   const mode=str(body.submissionMode,30);
   if(!['teacher','ai'].includes(mode))return fail('Vui lòng chọn hình thức nộp bài');
   const content=str(body.content,20000).trim(),audioPath=str(body.audioPath,400)||null;
   if(skill==='writing'&&!content)return fail('Hãy nhập bài Writing trước khi nộp');
   if(skill==='speaking'&&!audioPath)return fail('Hãy ghi âm Speaking trước khi nộp');
   if(audioPath){const {data:media}=await db.storage.from('ielts-media').list(audioPath.split('/').slice(0,-1).join('/'),{search:audioPath.split('/').at(-1)});if(!media?.some((f:any)=>f.name===audioPath.split('/').at(-1)))return fail('Không tìm thấy tệp ghi âm');}
   const {data:saved,error}=await db.from('skill_work').insert({student_id:user.id,class_id:body.classId,skill,part:integer(body.part,1,skill==='writing'?2:3),content,audio_path:audioPath,submission_mode:mode,submission_status:mode==='teacher'?'submitted_to_teacher':'awaiting_ai'}).select('id').single();
   if(error)throw error;return NextResponse.json({ok:true,workId:saved.id,submissionMode:mode,aiRequested:mode==='ai'});
  }
  return fail('Thao tác không hỗ trợ',404);
 }catch(e:any){console.error('API action failed',e);return fail(e?.message||'Đã xảy ra lỗi',400)}
}
