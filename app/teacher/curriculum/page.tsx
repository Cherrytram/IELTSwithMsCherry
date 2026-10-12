'use client';
import {useCallback,useEffect,useState} from 'react';
import Link from 'next/link';
import ActivityVisualEditor,{parseActivityContent,validateActivityContent,ActivityContent} from '@/components/ActivityVisualEditor';

type Level='course'|'unit'|'lesson'|'activity';
type Item={id:string;title:string;description?:string;published:boolean;position:number;class_id?:string;course_id?:string;unit_id?:string;lesson_id?:string;skill?:string;kind?:string;content?:Record<string,unknown>};
type Tree={courses:Item[];units:Item[];lessons:Item[];activities:Item[]};
const empty:Tree={courses:[],units:[],lessons:[],activities:[]};
const skillOptions=['reading','listening','writing','speaking','vocabulary'];
const kindOptions=['theory','practice','exam','assignment'];
export default function CurriculumStudio(){
 const [classes,setClasses]=useState<{id:string;name:string}[]>([]);
 const [classId,setClassId]=useState('');
 const [tree,setTree]=useState<Tree>(empty);
 const [selected,setSelected]=useState<{level:Level;item:Item}|null>(null);
 const [title,setTitle]=useState('');const [description,setDescription]=useState('');
 const [content,setContent]=useState<ActivityContent>(parseActivityContent({}));const [skill,setSkill]=useState('reading');const [kind,setKind]=useState('theory');
 const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);
 const api=useCallback(async(body:Record<string,unknown>)=>{
  const res=await fetch('/api/curriculum',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const json=await res.json();if(!res.ok)throw new Error(json.error||'Request failed');return json;
 },[]);
 const refresh=useCallback(async(id:string)=>{if(!id){setTree(empty);return}const data=await api({operation:'list',level:'course',classId:id});setTree(data)},[api]);
 useEffect(()=>{let active=true;(async()=>{try{
  const res=await fetch('/api/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'bootstrap'})});
  const data=await res.json();if(!res.ok)throw new Error(data.error||'Please log in');
  if(data.profile?.role!=='teacher')throw new Error('Teacher account required');
  if(active){setClasses(data.classes||[]);if(data.classes?.length)setClassId(data.classes[0].id)}
 }catch(e){if(active)setError((e as Error).message)}})();return()=>{active=false}},[]);
 useEffect(()=>{refresh(classId).catch(e=>setError(e.message))},[classId,refresh]);
 const run=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');setNotice('');try{await fn()}catch(e){setError((e as Error).message)}finally{setBusy(false)}};
 const choose=(level:Level,item:Item)=>{setSelected({level,item});setTitle(item.title);setDescription(item.description||'');setSkill(item.skill||'reading');setKind(item.kind||'theory');setContent(parseActivityContent(item.content||{}))};
 const create=async(level:Level,parentId?:string)=>run(async()=>{
  const name=window.prompt(`New ${level} title:`)?.trim();if(!name)return;
  const result=await api({operation:'create',level,classId,parentId,title:name,skill:'reading',kind:'theory',position:({course:tree.courses.length,unit:tree.units.length,lesson:tree.lessons.length,activity:tree.activities.length})[level]});
  await refresh(classId);choose(level,result.item);setNotice(`${level} created as draft`);
 });
 const save=async()=>{if(!selected)return;await run(async()=>{
  let parsed:Record<string,unknown>|undefined;
  if(selected.level==='activity'){
   const issue=validateActivityContent(content,skill,kind);
   if(issue)throw new Error(issue);
   parsed=content as unknown as Record<string,unknown>;
  }
  const {item}=await api({operation:'update',level:selected.level,classId,id:selected.item.id,title,description,skill,kind,content:parsed});
  await refresh(classId);choose(selected.level,item);setNotice('Changes saved');
 })};
 const togglePublish=async()=>{if(!selected)return;await run(async()=>{
  const {item}=await api({operation:'update',level:selected.level,classId,id:selected.item.id,published:!selected.item.published});
  await refresh(classId);choose(selected.level,item);setNotice(item.published?'Published':'Returned to draft');
 })};
 const remove=async()=>{if(!selected||!window.confirm(`Delete ${selected.item.title} and all nested content? This cannot be undone.`))return;
  await run(async()=>{await api({operation:'delete',level:selected.level,classId,id:selected.item.id});setSelected(null);await refresh(classId);setNotice('Deleted')})};
 const move=async(direction:-1|1)=>{if(!selected)return;const key=({course:'courses',unit:'units',lesson:'lessons',activity:'activities'} as const)[selected.level];
  const siblings=tree[key].filter(x=>selected.level==='course'?x.class_id===classId:selected.level==='unit'?x.course_id===selected.item.course_id:selected.level==='lesson'?x.unit_id===selected.item.unit_id:x.lesson_id===selected.item.lesson_id).sort((a,b)=>a.position-b.position);
  const idx=siblings.findIndex(x=>x.id===selected.item.id);const other=siblings[idx+direction];if(!other)return;
  await run(async()=>{const a=selected.item.position,b=other.position;
   await api({operation:'update',level:selected.level,classId,id:other.id,position:a});
   const {item}=await api({operation:'update',level:selected.level,classId,id:selected.item.id,position:b});
   await refresh(classId);choose(selected.level,item);setNotice('Order updated')});
 };
 const renderItems=(level:Level,items:Item[],parentId?:string)=>items.filter(x=>level==='course'?x.class_id===classId:level==='unit'?x.course_id===parentId:level==='lesson'?x.unit_id===parentId:x.lesson_id===parentId).map(item=><div key={item.id} style={{marginLeft:level==='course'?0:level==='unit'?14:level==='lesson'?28:42,marginTop:6}}>
  <button type="button" onClick={()=>choose(level,item)} style={{background:selected?.item.id===item.id?'#e9e2fa':'#fff',border:'1px solid #ded8ed',borderRadius:8,padding:'9px 10px',textAlign:'left',width:'100%',cursor:'pointer',color:'#34314a'}}>
   {level==='course'?'📚':level==='unit'?'📁':level==='lesson'?'📖':'✏️'} {item.title} <span style={{fontSize:11,color:item.published?'#347e6d':'#8b7bd0'}}>· {item.published?'Published':'Draft'}</span>
  </button>
  {level==='course'&&<>{renderItems('unit',tree.units,item.id)}<button onClick={()=>create('unit',item.id)} disabled={busy} style={smallButton}>+ Unit</button></>}
  {level==='unit'&&<>{renderItems('lesson',tree.lessons,item.id)}<button onClick={()=>create('lesson',item.id)} disabled={busy} style={{...smallButton,marginLeft:14}}>+ Lesson</button></>}
  {level==='lesson'&&<>{renderItems('activity',tree.activities,item.id)}<button onClick={()=>create('activity',item.id)} disabled={busy} style={{...smallButton,marginLeft:28}}>+ Activity</button></>}
 </div>);
 return <main style={{minHeight:'100vh',background:'#faf9ff',color:'#34314a',padding:'24px max(16px,4vw)',fontFamily:'Arial,sans-serif'}}>
  <div style={{maxWidth:1200,margin:'auto'}}>
   <Link href="/" style={{color:'#7565bd'}}>← Dashboard</Link>
   <h1 style={{fontSize:28,margin:'16px 0 6px'}}>Teacher Studio · Curriculum</h1>
   <p style={{color:'#6e6883'}}>Create Courses → Units → Lessons → Activities. All new content starts as a draft.</p>
   {error&&<p role="alert" style={{color:'#a32e49',background:'#ffe8ed',padding:12,borderRadius:8}}>{error}</p>}
   {notice&&<p role="status" style={{color:'#276c58',background:'#e4f6ee',padding:12,borderRadius:8}}>{notice}</p>}
   <div style={{margin:'16px 0'}}><label htmlFor="class">Class: </label><select id="class" value={classId} onChange={e=>{setClassId(e.target.value);setSelected(null)}} style={{padding:9,borderRadius:8}}>{classes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
   <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,440px),1fr))',gap:18,alignItems:'start'}}>
    <section style={panel}><h2>Course outline</h2><button style={primaryButton} disabled={!classId||busy} onClick={()=>create('course')}>+ New Course</button>
     {tree.courses.length?renderItems('course',tree.courses):<p style={{color:'#827b97'}}>No courses yet. Create your first course.</p>}
    </section>
    <section style={panel}><h2>{selected?`Edit ${selected.level}`:'Select an item'}</h2>
     {!selected?<p style={{color:'#827b97'}}>Select a course, unit, lesson or activity on the left to edit it.</p>:<div style={{display:'grid',gap:12}}>
      <label>Title<input value={title} onChange={e=>setTitle(e.target.value)} maxLength={160} style={field}/></label>
      {selected.level!=='activity'?<label>Description<textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} style={field}/></label>:<>
       <label>Skill<select value={skill} onChange={e=>setSkill(e.target.value)} style={field}>{skillOptions.map(s=><option key={s}>{s}</option>)}</select></label>
       <label>Activity type<select value={kind} onChange={e=>setKind(e.target.value)} style={field}>{kindOptions.map(k=><option key={k}>{k}</option>)}</select></label>
       <ActivityVisualEditor value={content} onChange={setContent} skill={skill} kind={kind}/>
      </>}
      <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
       <button style={primaryButton} disabled={busy||!title.trim()} onClick={save}>Save Changes</button>
       <button style={secondaryButton} disabled={busy} onClick={togglePublish}>{selected.item.published?'Unpublish':'Publish'}</button>
       <button style={secondaryButton} disabled={busy} onClick={()=>move(-1)}>↑ Move</button>
       <button style={secondaryButton} disabled={busy} onClick={()=>move(1)}>↓ Move</button>
       <button style={{...secondaryButton,color:'#aa3f57'}} disabled={busy} onClick={remove}>Delete</button>
      </div>
      <p style={{fontSize:12,color:'#827b97'}}>A student can only see published courses, units, lessons and activities when all parent levels are published.</p>
     </div>}
    </section>
   </div>
  </div>
 </main>;
}
const panel:React.CSSProperties={background:'#fff',border:'1px solid #eee9f5',borderRadius:16,padding:20,boxShadow:'0 4px 18px #34314a0a'};
const field:React.CSSProperties={display:'block',width:'100%',padding:10,borderRadius:8,border:'1px solid #d9d1e9',marginTop:5,boxSizing:'border-box'};
const primaryButton:React.CSSProperties={background:'#8b7bd0',color:'#fff',border:0,borderRadius:8,padding:'10px 14px',cursor:'pointer'};
const secondaryButton:React.CSSProperties={background:'#f0ecfa',color:'#554a8d',border:0,borderRadius:8,padding:'10px 14px',cursor:'pointer'};
const smallButton:React.CSSProperties={...secondaryButton,padding:'5px 9px',marginTop:5,fontSize:12};
