const {chromium}=require('playwright-core');const assert=require('node:assert/strict');const crypto=require('node:crypto');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],headless:true});try{
const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.BASE_URL||'http://127.0.0.1:8000/');await p.locator('#githubRepo').waitFor();
const image=await p.evaluate(async()=>{
const c=document.createElement('canvas');c.width=100;c.height=100;c.getContext('2d').fillRect(0,0,100,100);const data=c.toDataURL('image/png').split(',')[1];
await dbPut('papers','p',{title:'跨页修补测试',createdAt:1,modules:[],qCount:2});
for(const n of [6,12])await dbPut('questions','q'+n,{pid:'p',n,answer:'B',analysis:'原解析保留',module:'常识判断',img:'i:old',mat:null,text:'旧文字',custom:'自定义字段保留'});
await dbPut('attempts','a',{pid:'p',qids:['q6','q12'],answers:{q6:{c:'A',t:12,res:'no'}},startedAt:1,elapsed:12,cur:0,mode:'paper',manualTiming:{sections:[]}});
await dbPut('qstate','q6',{note:'保留笔记',noteImages:['i:old'],flag:true,kp:['测试'],wrongCount:1});await dbPut('memos','p',{entries:[{text:'随手记'}]});
await loadData();return data;
});
const digest=crypto.createHash('sha256').update(Buffer.from(image,'base64')).digest('hex'),ref='i:repair-'+digest;
const patch={format:'cuotiben-image-repairs-v1',revision:'test-v1',paperId:'p',questions:[6,12].map(n=>({id:'q'+n,n,img:ref,mat:ref,matKey:'shared',text:n+'.题干及A.B.C.D.完整选项'})),images:{[ref]:{type:'image/png',data:image}}};
const bytes=Buffer.from(JSON.stringify(patch));const manifest={format:'cuotiben-image-repairs-manifest-v1',revision:patch.revision,paperId:'p',questions:patch.questions,parts:['a'.repeat(40)],bytes:bytes.length,digest:crypto.createHash('sha256').update(bytes).digest('hex')};let corrupted=true;
await p.route('https://api.github.com/**',async route=>{
const request=route.request();assert.equal(request.method(),'GET');const path=new URL(request.url()).pathname;
if(path.endsWith('/cuotiben-corrections.json'))return route.fulfill({status:404,json:{}});
if(path.endsWith('/cuotiben-image-repairs.json'))return route.fulfill({json:{content:Buffer.from(JSON.stringify(manifest)).toString('base64')}});
if(path.endsWith('/git/blobs/'+'a'.repeat(40)))return route.fulfill({json:{content:(corrupted?Buffer.from('bad'):bytes).toString('base64')}});
if(path.endsWith('/git/ref/heads/main'))return route.fulfill({json:{object:{sha:'head'}}});return route.fulfill({json:{private:true,default_branch:'main'}});
});
const before=await p.evaluate(async()=>({attempts:await dbAll('attempts'),qstate:await dbAll('qstate'),memos:await dbAll('memos')}));
await p.locator('#githubRepo').fill('test/private');await p.locator('#githubToken').fill('test-key');await p.locator('[data-github=corrections]').click();await p.locator('#githubStatus').filter({hasText:'完整性校验失败'}).waitFor();assert.equal(await p.evaluate(()=>D.questions.get('q6').img),'i:old');
corrupted=false;await p.locator('[data-github=corrections]').click();await p.locator('#githubStatus').filter({hasText:'云端修订检查完成'}).waitFor();
const result=await p.evaluate(async()=>({attempts:await dbAll('attempts'),qstate:await dbAll('qstate'),memos:await dbAll('memos'),q:D.questions.get('q6')}));
for(const key of ['attempts','qstate','memos'])assert.deepEqual(result[key],before[key]);assert.equal(result.q.img,ref);assert.equal(result.q.matKey,'shared');assert.equal(result.q.answer,'B');assert.equal(result.q.custom,'自定义字段保留');
assert.equal(await p.evaluate(patch=>applyImageRepairs(patch),patch),false);
await p.reload();await p.locator('#githubRepo').waitFor();assert.equal(await p.evaluate(()=>D.questions.get('q12').img),ref);
await p.evaluate(()=>openReview([{qid:'q6'}]));await p.locator('img[alt="第6题"]').waitFor();assert.deepEqual(errors,[]);
// A stale applied marker must not suppress repair of an overwritten image.
await p.evaluate(async()=>{const q=D.questions.get('q6');q.img='i:old';await dbPut('questions',q.id,q);render();});
await p.locator('[data-act=repairQuestionImage]').click();await p.locator('#githubRepo').fill('test/private');await p.locator('#githubToken').fill('test-key');await p.locator('[data-github=corrections]').click();await p.locator('#githubStatus').filter({hasText:'第6题完整题图已应用'}).waitFor();assert.equal(await p.evaluate(()=>D.questions.get('q6').img),ref);
await p.locator('[data-act=closeSheet]').click();
// Missing local blob bytes must be restored even if question refs and revision match.
await p.evaluate(async ref=>{await idbReq('blobs','readwrite',s=>s.delete(ref.slice(2)));},ref);
assert.equal(await p.evaluate(patch=>applyImageRepairs(patch),patch),true);
console.log('PASS: authenticated private repair download, rejects corrupt payload, atomically replaces only question fields, preserves answers/times/notes/memos, reload and idempotency');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
