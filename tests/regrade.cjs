const {chromium}=require('playwright-core');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.BASE_URL||'http://127.0.0.1:8000/');await p.locator('#githubRepo').waitFor();
await p.evaluate(async()=>{
await dbPut('papers','paper',{title:'重新判分',createdAt:1,qCount:2,modules:[{name:'不定项',from:1,pts:2,min:1}]});
await dbPut('questions','q1',{pid:'paper',n:1,module:'不定项',answer:'AB'});await dbPut('questions','q2',{pid:'paper',n:2,module:'不定项',answer:'D'});
await dbPut('attempts','done',{pid:'paper',qids:['q1','q2'],mode:'paper',startedAt:1,finishedAt:100,elapsed:30,answers:{q1:{c:'BA',t:12,res:'no'},q2:{c:'C',t:18,res:'no'}},summary:{ok:0,no:2}});
await dbPut('attempts','live',{pid:'paper',qids:['q1'],mode:'paper',startedAt:200,cur:0,elapsed:5,answers:{q1:{c:'A',t:5}}});
await dbPut('qstate','q1',{tries:1,wrongCount:1,inBook:true,bookAt:100,lastAt:100,lastRes:'no',note:'保留笔记',kp:['保留标签'],flag:true});
await idbReq('blobs','readwrite',s=>s.put(new Blob(['do-not-change']),'sentinel'));
});
await p.reload();await p.locator('#githubRepo').waitFor();
const result=await p.evaluate(async()=>({a:D.attempts.find(x=>x.id==='done'),live:D.attempts.find(x=>x.id==='live'),state:qs('q1'),blob:await (await idbReq('blobs','readonly',s=>s.get('sentinel'))).text(),again:await regradeCompletedAttempts()}));
assert.equal(result.a.summary.ok,1);assert.equal(result.a.summary.no,1);assert.equal(result.a.summary.score,2);assert.equal(result.a.summary.byMod['不定项'].ok,1);assert.equal(result.a.answers.q1.c,'BA');assert.equal(result.a.answers.q1.t,12);assert.equal(result.a.elapsed,30);assert.equal(result.state.note,'保留笔记');assert.equal(result.state.flag,true);assert.equal(result.state.tries,1);assert.equal(result.state.wrongCount,0);assert.equal(result.state.inBook,false);assert.equal(result.blob,'do-not-change');assert.equal(result.live.finishedAt,undefined);assert.equal(result.live.answers.q1.c,'A');assert.equal(result.again,0);
await p.reload();await p.locator('#githubRepo').waitFor();assert.equal(await p.evaluate(()=>qs('q1').wrongCount),0);assert.deepEqual(errors,[]);
console.log('PASS: refresh regrades reports/modules/scores, preserves choices/time/images/notes/unfinished progress, corrects automatic wrong-book entry, repeatable');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
