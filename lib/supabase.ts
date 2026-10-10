
import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const browserDb = () =>
  createBrowserClient(url, anon);

export function studentEmail(
  classCode: string,
  studentCode: string
) {
  const valid = /^[A-Z0-9_-]{3,30}$/;

  const a = classCode.trim().toUpperCase();
  const b = studentCode.trim().toUpperCase();

  if (!valid.test(a) || !valid.test(b)) {
    throw new Error(
      'Mã lớp/mã học sinh phải gồm 3–30 ký tự A–Z, 0–9, _ hoặc -'
    );
  }

  return `${a.toLowerCase()}.${b.toLowerCase()}@students.ielts-academy.invalid`;
}
