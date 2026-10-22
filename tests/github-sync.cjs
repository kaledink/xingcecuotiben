const {chromium}=require('playwright-core'); const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
 const p=await b.newPage();const blobs=new Map();let seq=0, manifest=null, pub=false, conflict=false, head='initial', bad=false;
 const sha=()=> (++seq).toString(16).padStart(40,'0'); const requests=[];
 await p.route('https://api.github.com/**',async route=>{const r=route.request(),path=new URL(r.url()).pathname.replace('/repos/test/private',''); const body=r.postDataJSON();requests.push({path,body});let result;
 if(path==='')result={private:!pub,default_branch:'main'};
 else if(path==='/git/ref/heads/main')result={object:{sha:head}};
 else if(path.startsWith('/git/commits/')&&r.method()==='GET')result={tree:{sha:'tree'}};
 else if(path==='/git/trees/tree')result={tree:manifest?[{path:'cuotiben-data.json',sha:manifest}]:[]};
 else if(path==='/git/blobs'){const id=sha();blobs.set(id,body.encoding==='base64'?body.content:Buffer.from(body.content).toString('base64')); result={sha:id};}
 else if(path.startsWith('/git/blobs/')){const id=path.split('/').pop(); result={content:bad&&id!==manifest?Buffer.from('corrupted').toString('base64'):blobs.get(id)};}
 else if(path==='/git/trees'){manifest=body.tree.find(x=>x.path==='cuotiben-data.json').sha;result={sha:'newtree'};}
 else if(path==='/git/commits')result={sha:'newcommit'};
 else if(path==='/git/refs/heads/main'){if(conflict)return route.fulfill({status:422,json:{}});assert.equal(body.force,false);head='newcommit';result={};}
 else throw Error('Unexpected '+path);
 await route.fulfill({json:result});});
 await p.goto('http://127.0.0.1:8000/');await p.locator('#githubRepo').waitFor();
 await p.evaluate(async()=>{await dbPut('meta','test',{value:'私人笔记'});await dbPut('memos','memo',{text:'随手记',createdAt:1});await dbPut('todos','todo',{text:'待办',createdAt:1});await putImage(new Blob(['image-test'],{type:'image/png'}));});
 await p.locator('#githubRepo').fill('test/private');await p.locator('#githubToken').fill('test-token');
 pub=true;await p.locator('[data-github=upload]').click();await p.getByText('操作未完成：为保护记录和图片，只允许连接私有仓库',{exact:true}).waitFor();assert.equal(blobs.size,0);pub=false;
 await p.locator('[data-github=upload]').click();await p.locator('#githubStatus').filter({hasText:'已完整保存到 GitHub'}).waitFor();
 assert(!JSON.stringify(requests).includes('test-token'));assert(!(await p.evaluate(()=>localStorage.getItem('cuotiben.github.v1'))).includes('test-token'));
 const saved=JSON.parse(Buffer.from(blobs.get(manifest),'base64').toString());const data=JSON.parse(Buffer.concat(saved.parts.map(x=>Buffer.from(blobs.get(x),'base64'))).toString());
 assert.equal(data.collections.meta[0].value,'私人笔记');assert.equal(data.collections.memos[0].text,'随手记');assert.equal(data.collections.todos[0].text,'待办');assert.equal(Object.keys(data.images).length,1);
 await p.evaluate(async()=>{await dbPut('meta','test',{value:'local-new'});});
 bad=true;await p.locator('[data-github=download]').click();await p.locator('#githubStatus').filter({hasText:'数据校验失败'}).waitFor();assert.equal(await p.evaluate(async()=>(await dbAll('meta'))[0].value),'local-new');bad=false;
 p.on('dialog',d=>d.accept());await p.locator('[data-github=download]').click();await p.locator('#githubStatus').filter({hasText:'已恢复全部记录和图片'}).waitFor();
 assert.equal(await p.evaluate(async()=>(await dbAll('meta'))[0].value),'私人笔记');assert.equal(await p.evaluate(async()=>await (await idbReq('blobs','readonly',s=>s.getAll()))[0].text()),'image-test');
 await p.locator('#githubToken').fill('test-token');conflict=true;await p.locator('[data-github=upload]').click();await p.locator('#githubStatus').filter({hasText:'远端已更新或请求被拒绝'}).waitFor();
 console.log('PASS: private-only, all collections/images roundtrip, integrity rejection preserves local records, credentials excluded, concurrent update rejected');
 }finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
