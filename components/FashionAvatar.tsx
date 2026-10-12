 'use client';
import {useId} from 'react';
export type FashionItem={id:string;sku?:string;name:string;slot:string;emoji?:string;asset_url?:string|null};
type Props={style:'boy'|'girl';items:FashionItem[];equipped:{slot:string;item_id:string}[];preview?:FashionItem|null;compact?:boolean};
export default function FashionAvatar({style,items,equipped,preview,compact=false}:Props){
 const uid=useId().replace(/:/g,'');
 const bySlot=(slot:string)=>preview?.slot===slot?preview:items.find(i=>i.id===equipped.find(e=>e.slot===slot)?.item_id);
 const layer=(slot:string)=>{const url=bySlot(slot)?.asset_url;return url&&/^(https:\/\/|\/starter-fashion\/)/.test(url)?url:null;};
 const hair=bySlot('hair')?.sku||'',top=bySlot('top')?.sku||'',bottom=bySlot('bottom')?.sku||'',shoes=bySlot('shoes')?.sku||'',acc=bySlot('accessory')?.sku||'',bg=bySlot('background')?.sku||'';
 const jacket=top==='jacket',hoodie=top==='hoodie',skirt=bottom==='skirt',boots=shoes==='boots',urban=hair==='hair-urban',wave=hair==='hair-wave';
 const hairColor=urban?'#34324d':wave?'#a15d66':style==='girl'?'#614269':'#383b54';
 const shirt=jacket?'#343a70':hoodie?'#a58bed':style==='girl'?'#ffc1d9':'#9bcde6';
 return <svg className={'fashion-figure '+(compact?'fashion-compact':'')} viewBox="0 0 300 430" role="img" aria-label={'Nhân vật '+(style==='girl'?'nữ':'nam')+' mặc trang phục đang chọn'}>
 <defs><linearGradient id={'bg'+uid} x2="1" y2="1"><stop stopColor={bg==='city'?'#34304f':'#ffebfa'}/><stop offset="1" stopColor={bg==='city'?'#8568a8':'#c9e9ff'}/></linearGradient></defs>
 <rect width="300" height="430" rx="28" fill={'url(#bg'+uid+')'}/>
 {bg==='sakura'?<g fill="#f5a4c9" opacity=".8"><circle cx="28" cy="95" r="20"/><circle cx="270" cy="110" r="28"/><circle cx="42" cy="38" r="10"/><circle cx="245" cy="35" r="13"/></g>:bg==='city'?<g fill="#d2a9f9" opacity=".65"><rect x="18" y="160" width="42" height="270"/><rect x="70" y="95" width="42" height="335"/><rect x="230" y="145" width="45" height="285"/></g>:<g fill="white" opacity=".65"><circle cx="36" cy="55" r="5"/><circle cx="257" cy="70" r="8"/><path d="M240 180l7 15 15 7-15 7-7 15-7-15-15-7 15-7Z"/></g>}
 {layer('background')&&<image href={layer('background')!} x="0" y="0" width="300" height="430" preserveAspectRatio="xMidYMid slice"/>}
 <ellipse cx="150" cy="401" rx="72" ry="12" fill="#706484" opacity=".2"/>
 {/* Legs and socks */}
 <path d="M111 266L105 366 132 366 146 287 155 287 168 366 194 366 187 266Z" fill="#f3bc9f"/>
 {skirt?<><path d="M111 272L189 272 211 326 90 326Z" fill="#e7a3c8"/><path d="M110 278L95 318M137 278L131 321M166 278L176 321M188 278L203 318" stroke="#c777ac" strokeWidth="3"/></>:<><path d="M110 264L151 270 146 344 106 344Z" fill={bottom==='jeans'?'#6e9ccc':'#81749e'}/><path d="M151 270L189 264 195 344 155 344Z" fill={bottom==='jeans'?'#628fbe':'#74688d'}/><path d="M150 274L150 343" stroke="#d2d8e9" strokeWidth="2"/></>}
 {layer('bottom')&&<image href={layer('bottom')!} x="0" y="0" width="300" height="430"/>}
 {/* shoes */}
 <path d="M106 356L133 356 137 387Q129 399 92 394L92 384Z" fill={boots?'#5e415c':'#fff'} stroke="#8e789d" strokeWidth="3"/>
 <path d="M167 356L194 356 207 384 207 394Q171 399 164 387Z" fill={boots?'#5e415c':'#fff'} stroke="#8e789d" strokeWidth="3"/>
 <path d="M95 389H136M167 389H204" stroke={boots?'#f4c0c8':'#a0a3c5'} strokeWidth="3"/>
 {layer('shoes')&&<image href={layer('shoes')!} x="0" y="0" width="300" height="430"/>}
 {/* neck, arms */}
 <path d="M138 153H163V187H138Z" fill="#f1b997"/><path d="M110 185Q88 196 81 242L70 289 91 296 116 243Z" fill="#f3bc9f"/><path d="M188 185Q210 196 218 242L230 289 209 296 184 243Z" fill="#f3bc9f"/>
 {/* body clothes */}
 <path d="M119 177Q150 193 181 177L203 194 193 270 107 270 97 194Z" fill={shirt} stroke={jacket?'#202c55':'#ae85b3'} strokeWidth="2"/>
 <path d="M102 195L86 246 104 255 121 211M198 195L214 246 196 255 180 211" fill={shirt} stroke="#a184b1" strokeWidth="2"/>
 {jacket?<><path d="M150 190V269" stroke="#faf2fc" strokeWidth="4"/><path d="M133 188L150 209 164 188" fill="none" stroke="#f7d6e9" strokeWidth="5"/><path d="M116 239H134M169 239H185" stroke="#f6d7ec" strokeWidth="3"/></>:hoodie?<><path d="M132 183Q150 206 168 183" fill="none" stroke="#e8d9ff" strokeWidth="7"/><path d="M145 204V226M158 204V226" stroke="#fff" strokeWidth="2"/><path d="M122 245Q150 251 179 245" stroke="#7f67b9" strokeWidth="2"/></>:<path d="M129 180Q150 200 171 180" fill="none" stroke="#fff" strokeWidth="6"/>}
 {layer('top')&&<image href={layer('top')!} x="0" y="0" width="300" height="430"/>}
 {/* back hair, face, front hair */}
 {style==='girl'&&<path d="M101 99Q94 47 149 42Q207 48 202 109L209 175 181 179 115 179 91 175Z" fill={hairColor}/>}
 <ellipse cx="150" cy="106" rx="49" ry="60" fill="#f5c7aa" stroke="#e8a68e" strokeWidth="2"/>
 <path d="M103 94Q97 46 151 44Q201 43 199 95L183 80Q146 90 122 73Q115 87 103 94Z" fill={hairColor}/>
 {urban?<path d="M102 85Q108 55 135 62L151 42 167 61 193 52 196 87" fill={hairColor}/>:wave?<path d="M105 100Q115 64 133 73Q152 92 169 70Q189 77 197 101" fill="none" stroke={hairColor} strokeWidth="13"/>:<path d="M121 70Q149 86 178 69" fill="none" stroke={hairColor} strokeWidth="12"/>}
 <ellipse cx="132" cy="113" rx="5" ry="7" fill="#43324e"/><ellipse cx="170" cy="113" rx="5" ry="7" fill="#43324e"/>
 <circle cx="134" cy="111" r="2" fill="white"/><circle cx="172" cy="111" r="2" fill="white"/>
 <path d="M142 138Q150 146 160 138" fill="none" stroke="#bc6b77" strokeWidth="3" strokeLinecap="round"/>
 <ellipse cx="113" cy="130" rx="9" ry="4" fill="#ed99a5" opacity=".6"/><ellipse cx="187" cy="130" rx="9" ry="4" fill="#ed99a5" opacity=".6"/>
 {layer('hair')&&<image href={layer('hair')!} x="0" y="0" width="300" height="430"/>}
 {acc==='glasses'&&<g stroke="#50425b" strokeWidth="4" fill="none"><circle cx="132" cy="114" r="17"/><circle cx="171" cy="114" r="17"/><path d="M149 112H154M114 111L103 106M188 111L198 106"/></g>}
 {acc==='crown'&&<path d="M115 54L112 21 130 36 150 12 171 36 190 21 185 54Z" fill="#ffdc75" stroke="#ce9a2c" strokeWidth="3"/>}
 {layer('accessory')&&<image href={layer('accessory')!} x="0" y="0" width="300" height="430"/>}
 <text x="150" y="418" textAnchor="middle" fontSize="11" fill={bg==='city'?'white':'#71637c'}>IELTS FASHION ACADEMY</text>
 </svg>
}
