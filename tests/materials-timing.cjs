const {chromium}=require('playwright-core');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
const p=await b.newPage({viewport:{width:800,height:700}});const errors=[];p.on('pageerror',e=>errors.push(e.stack));await p.goto(process.env.BASE_URL||'http://127.0.0.1:8000/');await p.locator('#githubRepo').waitFor();
const detection=await p.evaluate(()=>{
const line=(text,top)=>({text,c:text,x0:25,x1:500,top,y:top+12});
const pages=[{w:600,h:1000,lines:[line('1.页顶第一题',4),line('A.选项',60),line('2.下一题',300),line('B.选项',360)]},{w:600,h:1000,lines:[line('3.页顶另一题',4),line('A.选项',60),line('4.下一题',300),line('B.选项',360)]}];
const st=detectStructure(pages);st.firstNum=1;const r=buildRegions(pages,st);
const missing=buildRegions(pages,{head:.1,foot:.95,firstNum:1,modules:[],markers:[{type:'q',num:1,page:0,y:4},{type:'q',num:3,page:1,y:4}]});
const materialPage={w:600,h:1600,lines:[line('根据以下材料，回答第1—5题',10),line('材料正文',40),...Array.from({length:6},(_,i)=>line(`${i+1}.测试题`,200+i*200))]};
const ms=detectStructure([materialPage]);ms.firstNum=1;const mr=buildRegions([materialPage],ms);
return {numbers:r.qs.map(x=>x.n),top:missing.qs[0].slices[0].top,missing:missing.missing,keptNumber:missing.qs[1].n,mats:mr.qs.map(x=>x.mat),materialEnd:mr.mats[mr.qs[0].mat].slices[0].bot};
});
assert.deepEqual(detection.numbers,[1,2,3,4]);assert.equal(detection.top,0);assert.deepEqual(detection.missing,[2]);assert.equal(detection.keptNumber,3);assert(detection.mats.slice(0,5).every(x=>x===detection.mats[0]&&x));assert.equal(detection.mats[5],null);assert.equal(detection.materialEnd,198);
await p.evaluate(async()=>{
const paper={id:'paper',title:'材料与用时',createdAt:1,modules:[{name:'旧分类',from:1}]};D.papers=[paper];await dbPut('papers',paper.id,paper);
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="500" height="2000"><rect width="500" height="2000" fill="white"/></svg>';
const mat=await putImage(new Blob([svg],{type:'image/svg+xml'}));
for(let i=1;i<=6;i++){const q={id:'q'+i,pid:'paper',n:i,module:'旧分类',answer:'A',mat:i<=5?mat:null,matKey:i<=5?'shared':null};D.questions.set(q.id,q);await dbPut('questions',q.id,q);}
await startAttempt({pid:'paper',qids:['q1','q2','q3','q4','q5','q6'],title:'材料与用时',mode:'paper'});
});
await p.locator('#matbody img').waitFor();await p.waitForFunction(()=>document.querySelector('#matbody img').complete);
const layout=await p.evaluate(()=>{const m=document.querySelector('#matpane').getBoundingClientRect(),q=document.querySelector('#qpane').getBoundingClientRect();return m.right<=q.left+1&&m.height>300;});assert(layout);
const cv=p.locator('#matInk');const bounds=await cv.boundingBox();await p.mouse.move(bounds.x+30,bounds.y+60);await p.mouse.down();await p.mouse.move(bounds.x+80,bounds.y+100);await p.mouse.up();
await p.evaluate(()=>document.querySelector('#matpane').scrollTop=150);await p.locator('[data-act=pNext]').click();
assert.equal(await p.evaluate(()=>INK.get('mat:shared').length),1);assert.equal(await p.locator('#matpane').evaluate(el=>el.scrollTop),150);
await p.locator('[data-act=pExit]').click();await p.waitForFunction(()=>!document.querySelector('.prac')&&!document.querySelector('#topbar').hidden);
const aid=await p.evaluate(()=>D.attempts[0].id);
const timing=await p.evaluate(async id=>{
const a=D.attempts.find(x=>x.id===id);a.finishedAt=100;a.answers={q1:{c:'A',t:1}};await dbPut('attempts',id,a);
const patch={format:'cuotiben-corrections-v1',revision:'test',paperId:'paper',attemptId:id,modules:[{name:'言语理解与表达',from:1},{name:'资料分析',from:3},{name:'不定项选择',from:5}],manualTiming:{sections:[{name:'言语理解与表达',modules:['言语理解与表达'],seconds:1449.41},{name:'资料分析＋不定项',modules:['资料分析','不定项选择'],seconds:2338.09}]}};
const applied=await applyDataCorrections(patch);const now=D.attempts.find(x=>x.id===id);return {patch,applied,total:now.summary.time,group:now.summary.byMod['资料分析＋不定项'],raw:now.answers.q1.t,elapsed:now.elapsed,again:await applyDataCorrections(patch)};
},aid);
assert.equal(timing.total,3787.5);assert.equal(timing.group.t,2338.09);assert.equal(timing.group.n,4);assert.equal(timing.raw,1);assert.equal(timing.again,false);
const cloudPatch=structuredClone(timing.patch);cloudPatch.revision='test-cloud';cloudPatch.manualTiming.sections[0].seconds=1449.42;
await p.route('https://api.github.com/**',async route=>{
 const req=route.request();assert.equal(req.method(),'GET');assert.equal(req.headers().authorization,'Bearer test-key');
 const path=new URL(req.url()).pathname;
 if(path.endsWith('/contents/cuotiben-image-repairs.json'))return route.fulfill({status:404,json:{}});
 if(path.endsWith('/contents/cuotiben-corrections.json'))return route.fulfill({json:{content:Buffer.from(JSON.stringify(cloudPatch)).toString('base64')}});
 if(path.endsWith('/git/ref/heads/main'))return route.fulfill({json:{object:{sha:'head'}}});
 return route.fulfill({json:{private:true,default_branch:'main'}});
});
await p.locator('#githubRepo').fill('test/private');await p.locator('#githubToken').fill('test-key');await p.locator('[data-github=corrections]').click();await p.locator('#githubStatus').filter({hasText:'云端修订检查完成'}).waitFor();
await p.reload();await p.locator('#githubRepo').waitFor();assert.equal(await p.evaluate(id=>D.attempts.find(x=>x.id===id).summary.time,aid),3787.51);assert.deepEqual(errors,[]);
console.log('PASS: page-top questions/crops, gap numbering, five-question material range, narrow left layout, shared ink/scroll, private timing patch/reload/idempotency without inventing question times');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
