 'use client';
import {useEffect,useState} from 'react';
import {useRouter} from 'next/navigation';
import FashionAvatar from '@/components/FashionAvatar';
import Link from 'next/link';
type Gender='boy'|'girl';
export default function Welcome(){
 const router=useRouter();
 const [step,setStep]=useState(1),[gender,setGender]=useState<Gender|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{void fetch('/api/fashion',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'load'})}).then(async r=>{if(!r.ok)throw Error('Please sign in as a student');return r.json()}).then(d=>{if(d.gender)router.replace('/fashion')}).catch(e=>setError(String(e.message)));},[router]);
 const finish=async()=>{if(!gender)return;setBusy(true);setError('');try{const r=await fetch('/api/fashion',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'gender',gender})});const d=await r.json();if(!r.ok)throw Error(d.error||'Could not save character');router.replace('/');}catch(e){setError(e instanceof Error?e.message:'Could not save');}finally{setBusy(false)}};
 return <main className="onboard12"><div className="onboard12-head"><Link href="/">← Back</Link><span>IELTS Fashion Academy</span><small>Step {step} of 2</small></div><h1>{step===1?'Choose your gender':'Choose your character'}</h1><p>{step===1?'Start your fashion journey with a full-body anime avatar.':'Meet your starter character! More outfits can be unlocked with Coins.'}</p><div className="onboard12-choices">{(step===1?(['boy','girl'] as const):([gender] as Gender[])).filter(Boolean).map(g=><button type="button" key={g} className={gender===g?'onboard12-selected':''} onClick={()=>{setGender(g);setStep(2)}}><div className="onboard12-figure"><FashionAvatar style={g} items={[]} equipped={[]}/></div><strong>{g==='boy'?'Anime Boy':'Anime Girl'}</strong><small>{g==='boy'?'Campus Collection':'Cherry Collection'}</small></button>)}</div>{step===2&&<div className="onboard12-actions"><button onClick={()=>setStep(1)} disabled={busy}>← Change gender</button><button onClick={()=>void finish()} disabled={busy||!gender}>{busy?'Saving…':'Choose character & continue →'}</button></div>}{error&&<p role="alert">{error}</p>}</main>;
}
