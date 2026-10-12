import {NextResponse} from 'next/server';
// Student AI grading is intentionally disabled. Writing/Speaking require teacher review.
export async function POST(){return NextResponse.json({error:'AI grading is disabled. Submit work for teacher review.'},{status:410});}
