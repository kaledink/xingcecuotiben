const {chromium}=require('playwright-core');
const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],headless:true});try{
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.goto(process.env.BASE_URL || 'http://127.0.0.1:8000/');await page.locator('#githubRepo').waitFor();
const parsed=await page.evaluate(()=>({multi:blockAnswer('1.【答案】B、A。解析：文字'),single:blockAnswer('【答案】C。解析'),equal:answersEqual('BA','AB'),partial:answersEqual('A','AB')}));
assert.deepEqual(parsed,{multi:'AB',single:'C',equal:true,partial:false});
await page.evaluate(async()=>{
const paper={id:'paper',title:'进度测试',qCount:3,answered:3,modules:[],createdAt:1};D.papers=[paper];await dbPut('papers',paper.id,paper);
for(const q of [{id:'q1',n:1,answer:'AB',module:'不定项选择'},{id:'q2',n:2,answer:'C',module:'常识判断'},{id:'q3',n:3,answer:'A',module:'常识判断'}]){q.pid='paper';D.questions.set(q.id,q);await dbPut('questions',q.id,q);}
await startAttempt({pid:'paper',qids:['q1','q2','q3'],title:'进度测试',mode:'paper'});
});
const opt=l=>page.locator(`.opt[data-l="${l}"]`);
await opt('B').click();await opt('A').click();
await page.waitForTimeout(350);assert.equal(await page.evaluate(()=>P.a.cur),0);assert.equal(await page.evaluate(()=>P.a.answers.q1.c),'AB');
assert.equal(await opt('A').getAttribute('aria-pressed'),'true');assert.equal(await opt('B').getAttribute('aria-pressed'),'true');
await page.locator('[data-act=pType]').selectOption('single');assert.equal(await page.evaluate(()=>P.a.answers.q1.c),'AB');
await opt('B').click();assert.equal(await page.evaluate(()=>P.a.answers.q1.c),'A');await page.keyboard.press('b');
await page.locator('[data-act=pExit]').click();
const attemptId=await page.evaluate(()=>D.attempts[0].id);
assert.equal(await page.evaluate(async id=>(await dbAll('attempts')).find(x=>x.id===id).answers.q1.c,attemptId),'AB');
await page.reload();await page.locator('#githubRepo').waitFor();
assert.equal(await page.evaluate(()=>D.papers[0].title),'进度测试');
await page.evaluate(id=>openPractice(D.attempts.find(x=>x.id===id)),attemptId);
assert.equal(await opt('B').getAttribute('aria-pressed'),'true');
await page.locator('[data-act=pNext]').click();await page.locator('[data-act=pType]').selectOption('multi');await opt('C').click();await page.waitForTimeout(350);
assert.equal(await page.evaluate(()=>P.a.cur),1); // uncertain choice with a single correct answer
await page.locator('[data-act=pNext]').click();await opt('A').click();
await page.evaluate(()=>submitAttempt());
const summary=await page.evaluate(id=>D.attempts.find(x=>x.id===id).summary,attemptId);assert.equal(summary.ok,3);assert.equal(summary.no,0);
assert.deepEqual(errors,[]);console.log('PASS: multi toggles/keyboard, no auto-advance, preserves answers on type switch, exit/reload/resume, single-answer multi mode, grading');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
