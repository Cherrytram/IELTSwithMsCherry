'use client';
import {useEffect,useState} from 'react';
type ClassRow={id:string;name:string;code:string};
type ReportRow={studentCode:string;studentName:string;assignment:string;dueAt:string;submittedAt:string;status:string;score:string;band:string;attemptCount:number};
type Report={class:ClassRow;rows:ReportRow[];summary:{students:number;assignments:number;expected:number;onTime:number;late:number;overdue:number;pending:number};generatedAt:string};
export default function TeacherReports(){
 const [classes,setClasses]=useState<ClassRow[]>([]),[classId,setClassId]=useState(''),[report,setReport]=useState<Report|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function post(path:string,body:object){const res=await fetch(path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!res.ok){const data=await res.json().catch(()=>({}));throw Error(data.error||'Request failed')}return res}
 useEffect(()=>{post('/api/homework',{action:'classes'}).then(r=>r.json()).then(j=>setClasses(j.classes||[])).catch(e=>setError(e.message))},[]);
 async function load(id:string){setClassId(id);setReport(null);setError('');if(!id)return;setBusy(true);try{const r=await post('/api/teacher-reports',{classId:id});setReport(await r.json())}catch(e){setError((e as Error).message)}finally{setBusy(false)}}
 async function exportCsv(){if(!classId)return;setError('');try{const res=await post('/api/teacher-reports',{classId,format:'csv'});const blob=await res.blob();const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ielts-homework-report.csv';document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url)}catch(e){setError((e as Error).message)}}
 const box:React.CSSProperties={border:'1px solid #e5e0f0',padding:14,borderRadius:12,background:'#faf9ff'};
 return <main style={{maxWidth:1200,margin:'auto',padding:24,fontFamily:'Arial,sans-serif',color:'#34314a'}}>
 <style>{'@media print {.no-print{display:none!important} body{background:white!important} table{font-size:10px} @page{size:A4 landscape;margin:12mm}}'}</style>
 <div className='no-print'><a href='/teacher/homework'>← Homework</a><h1>Teacher Studio · Homework Reports</h1><p>Export a spreadsheet-compatible CSV or print/save the report as PDF.</p>
 <label>Class <select value={classId} onChange={e=>void load(e.target.value)} style={{padding:10,minWidth:250,borderRadius:8}}><option value=''>Choose class</option>{classes.map(c=><option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}</select></label>
 {report&&<span style={{display:'inline-flex',gap:10,marginLeft:12}}><button onClick={()=>void exportCsv()}>Download CSV (Excel)</button><button onClick={()=>window.print()}>Print / Save as PDF</button><button onClick={()=>void load(classId)}>Refresh</button></span>}
 {busy&&<p>Loading report…</p>}{error&&<p role='alert' style={{color:'#b32b50'}}>{error}</p>}</div>
 {report&&<><h2>{report.class.name} · Homework Report</h2><p>Generated: {new Date(report.generatedAt).toLocaleString('en-GB')}</p>
 <div style={{display:'flex',flexWrap:'wrap',gap:10}}>{Object.entries(report.summary).map(([k,v])=><div key={k} style={box}><strong>{v}</strong><div style={{textTransform:'capitalize'}}>{k}</div></div>)}</div>
 <div style={{overflowX:'auto',marginTop:20}}><table style={{borderCollapse:'collapse',width:'100%',fontSize:13}}><thead><tr>{['Code','Student','Homework','Deadline','First submitted','Status','Best score','Band','Attempts'].map(x=><th key={x} style={{border:'1px solid #ddd',padding:8,textAlign:'left',background:'#eee9fb'}}>{x}</th>)}</tr></thead><tbody>{report.rows.map((r,i)=><tr key={i}>{[r.studentCode,r.studentName,r.assignment,new Date(r.dueAt).toLocaleString('en-GB'),r.submittedAt?new Date(r.submittedAt).toLocaleString('en-GB'):'',r.status,r.score,r.band,r.attemptCount].map((v,j)=><td key={j} style={{border:'1px solid #ddd',padding:7}}>{v}</td>)}</tr>)}</tbody></table></div>
 <p style={{fontSize:12,color:'#666'}}>Submission status is based on the first submitted attempt for the assigned activity. A later retake does not erase a late submission. Scores show the best graded attempt.</p></>}
 </main>
}
