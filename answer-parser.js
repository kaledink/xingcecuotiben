/* Conservative answer matching: explicit numbers, independent evidence, no inferred letters. */
(function(root){
'use strict';
const fold=s=>String(s||'').replace(/[！-～]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248)).replace(/\u3000/g,' ');
const letters=s=>[...new Set(fold(s).toUpperCase().match(/[A-D]/g)||[])].sort().join('');
const token='[A-D](?:[ \\t、,，和及]*[A-D])*';
const label='(?:【(?:参考)?答[ \\t]*案】|\\[(?:参考)?答[ \\t]*案\\]|(?:正确|参考)?答[ \\t]*案)[ \\t]*(?:是|为|选)?[ \\t]*[：:;；,，=]?[ \\t]*';
const labelled=new RegExp(label+'('+token+')(?![A-Za-z])','gi');
const heading=/^(?:第\s*)?(\d{1,3})(?:\s*题\s*[.、:：]?|\s*[.、:：])\s*/;
function blockAnswer(block){
 const text=fold(block).replace(heading,'');const matches=[...text.matchAll(labelled)].map(x=>letters(x[1]));
 if(matches.length)return new Set(matches).size===1?matches[0]:null;
 const lead=text.match(new RegExp('^('+token+')(?![A-Za-z])(?=$|[ \\t。;；,，\\n])','i'));
 return lead?letters(lead[1]):null;
}
function splitAnalysis(text){
 const T=fold(text),starts=[];let offset=0;
 const lines=T.split('\n');
 for(let index=0;index<lines.length;index++){
  const line=lines[index],m=line.trimStart().match(heading);if(m){
   const after=line.trimStart().slice(m[0].length)||lines[index+1]?.trimStart()||'';
   const multiple=[...line.matchAll(/\d{1,3}\s*[.、:：]\s*[A-D]+/gi)].length>1;
   const strong=new RegExp('^'+label,'i').test(after)||/^(?:【解析】|\[解析\]|解析)/.test(after);
   const lead=new RegExp('^('+token+')(?![A-Za-z])(?=$|[ \\t。;；,，])','i').test(after);
   if(!multiple&&(strong||lead))starts.push({n:+m[1],at:offset+line.length-line.trimStart().length,strong});
  }
  offset+=line.length+1;
 }
 return {starts,blocks:starts.map((s,i)=>T.slice(s.at,starts[i+1]?.at??T.length))};
}
function parse(text,{expectedNumbers}={}){
 const T=fold(text),expected=expectedNumbers?new Set(expectedNumbers.map(Number)):null;
 const ans={},ana={},spans={},candidates={},warnings=[],blocked=new Set();
 const add=(n,value,source)=>{
  if(expected&&!expected.has(n)){warnings.push(`识别到试卷范围外的第${n}题，已忽略`);return;}
  if(!candidates[n])candidates[n]=[];
  candidates[n].push({answer:letters(value),source});
 };
 const tableLines=T.split('\n');
 for(let i=0;i<tableLines.length-1;i++){
  const nums=tableLines[i].match(/^\s*(?:题号[：:]?\s*)?(\d{1,3}(?:[ \t]+\d{1,3}){1,})\s*$/),answers=tableLines[i+1].match(/^\s*(?:答案[：:]?\s*)?([A-D]+(?:[ \t]+[A-D]+){1,})\s*$/i);
  if(nums&&answers){const ns=nums[1].split(/\s+/).map(Number),values=answers[1].split(/\s+/);if(ns.length===values.length&&new Set(ns).size===ns.length)ns.forEach((n,i)=>add(n,values[i],'答案表'));else warnings.push('横向答案表的题号与答案数量不一致，未自动填入');}
 }
 for(const line of tableLines){
  const range=line.match(/^\s*(\d{1,3})\s*[-—–~～至]\s*(\d{1,3})\s*[：:.、]?\s*([A-D \t、,，;；]+)\s*$/i);
  if(range){
   const lo=+range[1],hi=+range[2],count=hi-lo+1,raw=range[3].trim();
   let values=raw.split(/[ \t、,，;；]+/).filter(Boolean);
   if(values.length===1&&values[0].length===count)values=[...values[0]];
   if(count>0&&count<=200&&values.length===count)values.forEach((v,i)=>add(lo+i,v,'答案表'));
   else {warnings.push(`第${lo}—${hi}题答案数量与题号范围不符，未自动填入`);for(let n=lo;n<=hi&&n<1000;n++)blocked.add(n);}
   continue;
  }
  const pairs=[...line.matchAll(new RegExp('(?:^|[ \\t;；,，])(?:第[ \\t]*)?(\\d{1,3})(?:题[：:]?|[.、:：])[ \\t]*('+token+')(?![A-Za-z])(?=$|[ \\t;；。,【\\[])','gi'))];
  if(pairs.length>=2||pairs.length===1&&/^\s*(?:第\s*)?\d{1,3}(?:题[：:]?|[.、:：])\s*[A-D][A-D \t、,，]*[;；。]?\s*$/i.test(line))for(const m of pairs)add(+m[1],m[2],'答案表');
 }
 const split=splitAnalysis(T),counts={};split.starts.forEach(s=>counts[s.n]=(counts[s.n]||0)+1);
 split.starts.forEach((s,i)=>{
  if(expected&&!expected.has(s.n))return;
  const block=split.blocks[i],answers=[...block.matchAll(labelled)].map(m=>letters(m[1]));
  if(!answers.length){const a=blockAnswer(block);if(a)answers.push(a);}
  for(const a of answers)add(s.n,a,'逐题解析');
  if(counts[s.n]!==1){warnings.push(`第${s.n}题出现重复解析，未自动关联解析文字和原图`);return;}
  if(/^[A-D][A-D \t、,，]*[;；。]?$/i.test(block.replace(heading,'').trim()))return;
  ana[s.n]=block.replace(heading,'').trim();spans[s.n]=[s.at,s.at+block.trimEnd().length];
 });
 for(const [n,list]of Object.entries(candidates)){
  const values=[...new Set(list.map(x=>x.answer))];
  if(values.length===1&&!blocked.has(+n))ans[n]=values[0];
  else warnings.push(`第${n}题答案存在冲突：${values.join(' / ')}，需人工核对`);
 }
 if(expected)for(const n of expected)if(!ans[n])warnings.push(`第${n}题没有可靠匹配的标准答案`);
 return {ans,ana,spans,candidates,warnings:[...new Set(warnings)]};
}
function quality(page){
 const text=(page.lines||[]).map(l=>l.text).join(''),compact=text.replace(/\s/g,'');
 const bad=(compact.match(/[\uFFFD\uE000-\uF8FF\x00-\x08]/g)||[]).length;
 const valid=(compact.match(/[\u3400-\u9fffA-Za-z0-9，。、；：！？（）【】,.!?():;\-]/g)||[]).length;
 const pairs=(fold(text).match(/\d{1,3}[.、:：]\s*[A-D]/gi)||[]).length;
 return {usable:(compact.length>=80||pairs>=2)&&bad/Math.max(1,compact.length)<.02&&valid/Math.max(1,compact.length)>.55,score:valid-4*bad,chars:compact.length};
}
function orderLines(page){
 const fragments=[];
 for(const line of page.lines){
  const items=line.items||[];let split=-1;
  for(let i=1;i<items.length;i++){const gap=items[i].x-items[i-1].x-items[i-1].w;if(gap>page.w*.07&&items[i].x>page.w*.42&&items[i-1].x+items[i-1].w<page.w*.59){split=i;break;}}
  if(split<0){fragments.push(line);continue;}
  for(const group of [items.slice(0,split),items.slice(split)]){
   const text=group.map((x,i)=>(i&&x.x-group[i-1].x-group[i-1].w>line.h*.6?' ':'')+x.s).join('');
   fragments.push({...line,items:group,text,c:fold(text.replace(/\s/g,'')),x0:group[0].x,x1:Math.max(...group.map(x=>x.x+x.w))});
  }
 }
 const left=fragments.filter(l=>l.x0<page.w*.42&&l.x1<page.w*.58),right=fragments.filter(l=>l.x0>page.w*.42);
 if(left.length<3||right.length<3||left.length+right.length<fragments.length*.7)return page.lines;
 const first=Math.min(...left.map(l=>l.top),...right.map(l=>l.top)),last=Math.max(...left.map(l=>l.y),...right.map(l=>l.y));
 const middle=fragments.filter(l=>!left.includes(l)&&!right.includes(l)&&l.top>=first&&l.y<=last);
 if(middle.length)return page.lines; // Ambiguous layouts stay in source order for review.
 const sorted=xs=>xs.sort((a,b)=>a.top-b.top);
 return [...sorted(fragments.filter(l=>l.y<first)),...sorted(left).map(l=>({...l,column:0})),...sorted(right).map(l=>({...l,column:1})),...sorted(fragments.filter(l=>l.top>last))];
}
const api={fold,letters,blockAnswer,splitAnalysis,parse,quality,orderLines};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.AnswerParser=api;
})(typeof globalThis!=='undefined'?globalThis:this);
