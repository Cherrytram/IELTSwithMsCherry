import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const browserDb=()=>createBrowserClient(url,anon);
export async function serverDb(){
 const jar=await cookies();
 return createServerClient(url,anon,{cookies:{getAll(){return jar.getAll()},setAll(items){try{items.forEach(({name,value,options})=>jar.set(name,value,options))}catch{}}}});
}
export function adminDb(){const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new Error('Missing server secret');return createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}})}
export function studentEmail(classCode:string,studentCode:string){
 const valid=/^[A-Z0-9_-]{3,30}$/;
 const a=classCode.trim().toUpperCase(),b=studentCode.trim().toUpperCase();
 if(!valid.test(a)||!valid.test(b))throw new Error('Mã lớp/mã học sinh phải gồm 3–30 ký tự A–Z, 0–9, _ hoặc -');
 return `${a.toLowerCase()}.${b.toLowerCase()}@students.ielts-academy.invalid`;
}
