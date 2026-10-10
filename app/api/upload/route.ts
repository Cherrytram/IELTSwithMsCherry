import {NextRequest,NextResponse} from 'next/server';import {adminDb,serverDb} from '@/lib/supabase';
export const runtime='nodejs';
export async function POST(req:NextRequest){
 try{const auth=await serverDb();const {data:{user}}=await auth.auth.getUser();if(!user)return NextResponse.json({error:'Unauthorized'},{status:401});
 const db=adminDb();const {data:p}=await db.from('profiles').select('role').eq('id',user.id).single();if(!p)return NextResponse.json({error:'Forbidden'},{status:403});
 const form=await req.formData();const file=form.get('file');const classId=String(form.get('classId')||'');
 if(!(file instanceof File)||file.size>15*1024*1024||file.size===0)return NextResponse.json({error:'File quá lớn hoặc không hợp lệ (tối đa 15 MB)'},{status:400});
 const types=['audio/mpeg','audio/mp4','audio/wav','audio/webm','image/jpeg','image/png','image/webp'];if(!types.includes(file.type))return NextResponse.json({error:'Chỉ hỗ trợ audio/image'},{status:400});
 if(p.role==='teacher'){const {data:c}=await db.from('classes').select('id').eq('id',classId).eq('teacher_id',user.id).single();if(!c)return NextResponse.json({error:'Không có quyền với lớp'},{status:403})}
 else {const {data:e}=await db.from('enrollments').select('class_id').eq('class_id',classId).eq('student_id',user.id).single();if(!e||!file.type.startsWith('audio/'))return NextResponse.json({error:'Không có quyền upload'},{status:403})}
 const ext=file.type.startsWith('image/')?(file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg'):(file.type==='audio/mpeg'?'mp3':file.type==='audio/wav'?'wav':file.type==='audio/mp4'?'m4a':'webm');
 const path=`${classId}/${user.id}/${crypto.randomUUID()}.${ext}`;
 const {error}=await db.storage.from('ielts-media').upload(path,await file.arrayBuffer(),{contentType:file.type,upsert:false});if(error)throw error;
 return NextResponse.json({path});
 }catch(e:any){return NextResponse.json({error:e.message||'Upload failed'},{status:400})}
}
