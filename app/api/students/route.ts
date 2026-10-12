import {NextRequest,NextResponse} from 'next/server';
import {adminDb,serverDb} from '@/lib/supabase-server';
import {studentEmail} from '@/lib/supabase';
export const runtime='nodejs';
const fail=(error:string,status=400)=>NextResponse.json({error},{status});
const randomPassword=()=>{const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$';const bytes=new Uint8Array(18);crypto.getRandomValues(bytes);return [...bytes].map(b=>alphabet[b%alphabet.length]).join('')};
export async function POST(req:NextRequest){try{
 const auth=await serverDb();const {data:{user}}=await auth.auth.getUser();if(!user)return fail('Sign in required',401);
 const db=adminDb();const body=await req.json();const action=String(body.action||'');
 if(action==='change_password'){const password=String(body.newPassword||'');if(password.length<8||password.length>72)return fail('Password must be 8–72 characters');const {error}=await auth.auth.updateUser({password});if(error)throw error;return NextResponse.json({ok:true})}
 const {data:profile}=await db.from('profiles').select('role').eq('id',user.id).single();if(profile?.role!=='teacher')return fail('Teacher access required',403);
 const owned=async(id:string)=>{const {data}=await db.from('classes').select('id,code,name').eq('id',id).eq('teacher_id',user.id).single();if(!data)throw Error('Class not found');return data};
 const cls=await owned(String(body.classId||''));
 if(action==='list'){const {data,error}=await db.from('enrollments').select('student_id,student_code,archived,profiles(display_name)').eq('class_id',cls.id).order('student_code');if(error)throw error;return NextResponse.json({students:data||[]})}
 if(action==='bulk_create'){
  const rows=body.rows;if(!Array.isArray(rows)||!rows.length||rows.length>100)return fail('Import 1–100 students');
  const parsed=rows.map((r:any)=>({studentCode:String(r.studentCode||'').trim().toUpperCase(),displayName:String(r.displayName||'').trim().slice(0,100)}));
  if(parsed.some(r=>!(/^[A-Z0-9_-]{3,30}$/).test(r.studentCode)||!r.displayName))return fail('Invalid student code or missing name');
  if(new Set(parsed.map(r=>r.studentCode)).size!==parsed.length)return fail('Duplicate codes in import');
  const {data:existing}=await db.from('enrollments').select('student_code').eq('class_id',cls.id);const known=new Set((existing||[]).map(r=>r.student_code));
  const results:{studentCode:string;displayName:string;password?:string;error?:string}[]=[];
  for(const row of parsed){if(known.has(row.studentCode)){results.push({...row,error:'Already exists'});continue}
   const password=randomPassword();const {data:created,error}=await db.auth.admin.createUser({email:studentEmail(cls.code,row.studentCode),password,email_confirm:true,user_metadata:{role:'student'}});
   if(error){results.push({...row,error:error.message});continue}
   try{const id=created.user.id;const {error:p}=await db.from('profiles').insert({id,role:'student',display_name:row.displayName});if(p)throw p;
    const {error:e}=await db.from('enrollments').insert({class_id:cls.id,student_id:id,student_code:row.studentCode,archived:false});if(e)throw e;
    const {error:w}=await db.from('wallets').insert({student_id:id,balance:0});if(w)throw w;
    await db.from('avatar_settings').upsert({student_id:id,style:'girl'});results.push({...row,password});known.add(row.studentCode);
   }catch(e){await db.auth.admin.deleteUser(created.user.id);results.push({...row,error:e instanceof Error?e.message:'Creation failed'})}
  }return NextResponse.json({results});
 }
 const studentId=String(body.studentId||'');const {data:enrollment}=await db.from('enrollments').select('student_code,archived').eq('class_id',cls.id).eq('student_id',studentId).maybeSingle();if(!enrollment)return fail('Student not in class',404);
 if(action==='reset_password'){const password=randomPassword();const {error}=await db.auth.admin.updateUserById(studentId,{password});if(error)throw error;return NextResponse.json({studentCode:enrollment.student_code,password})}
 if(action==='archive'){const archived=body.archived===true;const {error}=await db.from('enrollments').update({archived}).eq('class_id',cls.id).eq('student_id',studentId);if(error)throw error;return NextResponse.json({ok:true,archived})}
 if(action==='transfer'){const target=await owned(String(body.targetClassId||''));if(target.id===cls.id)return fail('Select another class');const {data:dup}=await db.from('enrollments').select('student_id').eq('class_id',target.id).eq('student_code',enrollment.student_code).maybeSingle();if(dup)return fail('Student code exists in target class');const {error}=await db.from('enrollments').update({class_id:target.id,archived:false}).eq('class_id',cls.id).eq('student_id',studentId);if(error)throw error;return NextResponse.json({ok:true})}
 return fail('Unsupported action',404);
}catch(e){return fail(e instanceof Error?e.message:'Request failed')}}
