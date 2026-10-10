export type QType='mcq'|'fill'|'dropdown';
export type Question={id:string;prompt:string;type:QType;options:string[];correct:string;alternatives?:string[];explanation?:string};
const uid=()=>Math.random().toString(36).slice(2,10);
export function normalize(s:string){return s.normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ')}
export function score(questions:Question[],answers:Record<string,string>){return questions.map(q=>({id:q.id,correct:normalize(answers[q.id]||'')!==''&&[q.correct,...(q.alternatives||[])].some(a=>normalize(a)===normalize(answers[q.id]||'')),expected:q.correct,answer:answers[q.id]||'',explanation:q.explanation||''}));}
// Bulk format: numbered question, then A. ... B. ...; prefix == for answer; [select] for dropdown.
export function parseBulk(raw:string):Question[]{
 const lines=raw.replace(/\r/g,'').split('\n');const groups:string[][]=[];let current:string[]=[];
 for(const line of lines){const t=line.trim();if(!t)continue;if(/^\d+[.)]\s+/.test(t)&&current.length){groups.push(current);current=[]}current.push(t)}
 if(current.length)groups.push(current);
 return groups.map(group=>{
  const first=group[0].replace(/^\d+[.)]\s*/, '');const dropdown=/^\[select\]/i.test(first);
  const prompt=first.replace(/^\[select\]\s*/i,'');
  const optionLines=group.slice(1).filter(s=>/^(==)?[A-H][.)]\s*/i.test(s));
  const opts=optionLines.map(s=>s.replace(/^==/,'').replace(/^[A-H][.)]\s*/i,''));
  const right=optionLines.find(s=>s.startsWith('=='));
  const correct=right?right.replace(/^==/,'').replace(/^[A-H][.)]\s*/i,''):'';
  const answerLine=group.slice(1).find(s=>s.startsWith('==')&&!/^(==)[A-H][.)]\s*/i.test(s));
  const explain=group.slice(1).find(s=>/^explain:/i.test(s));
  return {id:uid(),prompt,type:dropdown?'dropdown':opts.length>=2?'mcq':'fill',options:opts,correct:correct||answerLine?.slice(2).trim()||'',explanation:explain?.replace(/^explain:\s*/i,'')||''} as Question;
 });
}
export function coins(correct:number,total:number){return total<=0?0:Math.round(correct/total*70)+(correct===total?30:0)}
