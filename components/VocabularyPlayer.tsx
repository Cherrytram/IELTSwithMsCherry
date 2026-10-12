'use client';
import {useState} from 'react';
export type Word={id:string;term:string;meaning:string;example:string};
const steps=['Learn','Recognize','Match','Spell','Apply'] as const;
const button:React.CSSProperties={padding:'10px 15px',border:0,borderRadius:10,background:'#8B7BD0',color:'white',cursor:'pointer'};
export default function VocabularyPlayer({words,answers,onAnswer,onSubmit,busy,submitted}:{words:Word[];answers:Record<string,string>;onAnswer:(id:string,value:string)=>void;onSubmit:()=>void;busy:boolean;submitted:boolean}){
 const [step,setStep]=useState(0),[index,setIndex]=useState(0),[showMeaning,setShowMeaning]=useState(false);
 if(!words.length)return <p>No vocabulary words in this activity yet.</p>;
 const word=words[index];const phase=steps[step];const id=`${phase.toLowerCase()}:${word.id}`;
 const choices=[word.meaning,...words.filter(w=>w.id!==word.id).map(w=>w.meaning)].filter((v,i,a)=>a.indexOf(v)===i).slice(0,4);
 const speak=()=>{if(typeof window==='undefined'||!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(word.term);u.lang='en-US';window.speechSynthesis.speak(u)};
 const next=()=>{setShowMeaning(false);if(index<words.length-1)setIndex(index+1);else if(step<4){setIndex(0);setStep(step+1)}};
 const back=()=>{setShowMeaning(false);if(index>0)setIndex(index-1);else if(step>0){setStep(step-1);setIndex(words.length-1)}};
 const isLast=step===4&&index===words.length-1;
 return <section style={{padding:20,background:'#faf9ff',border:'1px solid #e2dced',borderRadius:16}}>
  <h3>Vocabulary Journey</h3><nav aria-label="Vocabulary steps" style={{display:'flex',flexWrap:'wrap',gap:7,marginBottom:15}}>{steps.map((s,i)=><span key={s} style={{padding:'7px 10px',borderRadius:20,background:i===step?'#8B7BD0':'#eae5f6',color:i===step?'white':'#514779'}}>{i+1}. {s}</span>)}</nav>
  <p>Word {index+1} of {words.length} · {phase}</p>
  {step===0?<div style={{textAlign:'center',padding:20,background:'white',borderRadius:12}}><h2>{word.term}</h2><button type="button" style={button} onClick={speak}>🔊 Pronounce</button><p>{showMeaning?word.meaning:'Try to remember the meaning.'}</p><button type="button" style={{...button,background:'#5e5682'}} onClick={()=>setShowMeaning(v=>!v)}>{showMeaning?'Hide':'Flip card'}</button>{word.example&&<p style={{fontStyle:'italic'}}>{word.example}</p>}</div>:<div style={{display:'grid',gap:10}}>
  <h3>{step===1?`Choose the meaning of “${word.term}”`:step===2?`Match “${word.term}” with its meaning`:step===3?`Spell the English word: ${word.meaning}`:`Complete the sentence: ${word.example||`Write the word meaning “${word.meaning}”`}`}</h3>
  {(step===1||step===2)?choices.map(c=><label key={c} style={{padding:11,background:'white',borderRadius:9,border:'1px solid #ddd'}}><input type="radio" name={id} checked={answers[id]===c} onChange={()=>onAnswer(id,c)}/> {c}</label>):<input aria-label={`${phase} answer`} style={{padding:12,border:'1px solid #ccc',borderRadius:9}} value={answers[id]||''} onChange={e=>onAnswer(id,e.target.value)} placeholder="Type your answer"/>}
 </div>}
 <div style={{display:'flex',flexWrap:'wrap',gap:10,marginTop:18}}><button style={{...button,background:'#e6e0f3',color:'#554a8d'}} onClick={back} disabled={step===0&&index===0}>Back</button>{!isLast?<button style={button} onClick={next}>Continue →</button>:<button style={button} onClick={onSubmit} disabled={busy||submitted}>Submit vocabulary practice</button>}</div>
 <p style={{fontSize:12,color:'#756c88'}}>No minimum score is required. You can submit after completing the five steps; the teacher's word bank is checked securely on the server. Retakes are allowed.</p>
 </section>
}
