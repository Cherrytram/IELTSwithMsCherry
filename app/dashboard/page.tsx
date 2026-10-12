'use client';
import {useEffect,useState} from 'react';
type Attempt={status:string;submitted_at:string;score:number|null;max_score:number|null};
type Assignment={id:string;activity_id:string;title:string;instructions:string;due_at:string;attempts:Attempt[]};
type Notice={id:string;title:string;message:string;link:string;read_at:string|null;created_at:string};
const panel:React.CSSProperties={background:'#fff',border:'1px solid #e6def1',borderRadius:16,padding:20};
export default function Dashboard(){
 const [data,setData]=useState<{assignments:Assignment[];notifications:Notice[];coins:number}|null>(null),[error,setError]=useState('');
 const api=async(payload:object)=>{const r=await fetch('/api/homework',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const j=await r.json();if(!r.ok)throw Error(j.error||'Request failed');return j};
 useEffect(()=>{api({action:'dashboard'}).then(setData).catch(e=>setError(e.message))},[]);
 const read=async(id:string)=>{try{await api({action:'read_notification',notificationId:id});setData(v=>v?{...v,notifications:v.notifications.map(n=>n.id===id?{...n,read_at:new Date().toISOString()}:n)}:v)}catch(e){setError((e as Error).message)}};
 const pending=data?.assignments.filter(a=>!a.attempts.length)||[];
 return <main style={{maxWidth:1100,margin:'auto',padding:'28px 18px',fontFamily:'Arial,sans-serif',background:'#faf9ff',minHeight:'100vh',color:'#34314a'}}>
 <header style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}><div><h1 style={{marginBottom:4}}>My Dashboard</h1><p style={{color:'#746d85'}}>Today's tasks & learning progress</p></div><nav style={{display:'flex',gap:14}}><a href='/learn'>My Courses</a><a href='/fashion'>Fashion Studio</a><a href='/progress'>My Progress</a><a href='/'>Home</a></nav></header>
 {error&&<p role='alert' style={{color:'#a3274a'}}>{error}</p>}
 {!data?<p>Loading dashboard…</p>:<><section style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:14,marginBottom:20}}><div style={panel}><h2>🪙 {data.coins}</h2><p>Coins available</p></div><div style={panel}><h2>{pending.length}</h2><p>Homework tasks remaining</p></div><div style={panel}><h2>{data.notifications.filter(n=>!n.read_at).length}</h2><p>Unread notifications</p></div></section>
 <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(320px,1fr))',gap:16}}><section style={panel}><h2>📚 Homework</h2>{!data.assignments.length?<p>No homework assigned yet.</p>:data.assignments.map(a=>{const completed=a.attempts.length>0;const late=Date.parse(a.due_at)<Date.now();const onTime=a.attempts.some(t=>Date.parse(t.submitted_at)<=Date.parse(a.due_at));return <article key={a.id} style={{borderTop:'1px solid #eee',padding:'12px 0'}}><strong>{a.title}</strong><p style={{whiteSpace:'pre-wrap'}}>{a.instructions}</p><small>Due: {new Date(a.due_at).toLocaleString()}</small><p style={{color:completed?'#207a61':late?'#b4473e':'#6857b2'}}>{completed?(onTime?'Submitted on time':'Submitted late'):late?'Overdue · late submissions accepted':'To do'}</p><a href='/learn'>Open course and complete activity →</a></article>})}</section>
 <section style={panel}><h2>🔔 Notifications</h2>{!data.notifications.length?<p>No notifications yet.</p>:data.notifications.map(n=><article key={n.id} style={{borderTop:'1px solid #eee',padding:'12px 0',opacity:n.read_at?0.8:1}}><strong>{n.title}</strong><p>{n.message}</p><small>{new Date(n.created_at).toLocaleString()}</small><div style={{display:'flex',gap:12,marginTop:8}}><a href={n.link.startsWith('/')?n.link:'/dashboard'}>View</a>{!n.read_at&&<button onClick={()=>read(n.id)}>Mark as read</button>}</div></article>)}</section></div></>}
 </main>
}
