const {chromium}=require('playwright-core');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{
const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.BASE_URL||'http://127.0.0.1:8000/');await p.locator('#githubRepo').waitFor();
const png=await p.evaluate(async()=>{
const c=document.createElement('canvas');c.width=50;c.height=50;c.getContext('2d').fillRect(0,0,50,50);const du=c.toDataURL('image/png');const blob=await(await fetch(du)).blob();const ref=await putImage(blob);
await dbPut('papers','p',{title:'图文笔记测试',createdAt:1,modules:[],qCount:2});
await dbPut('questions','q',{pid:'p',n:1,module:'常识判断',answer:'A',analysis:'文字解析测试',anaImg:ref});await dbPut('questions','q2',{pid:'p',n:2,module:'常识判断',answer:'B',analysis:'仅文字解析'});
await loadData();openReview([{qid:'q'},{qid:'q2'}]);return du.split(',')[1];
});
await p.getByRole('tab',{name:'图片版',exact:true}).click();await p.locator('.anaimg').waitFor();await p.getByRole('tab',{name:'文字版',exact:true}).click();await p.locator('#anaBox').filter({hasText:'文字解析测试'}).waitFor();
await p.locator('#noteBox').fill('保留文字笔记');
const file={name:'screenshot.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')};await p.locator('#noteImageIn').setInputFiles([file,{...file,name:'second.png'}]);await p.waitForFunction(()=>qs('q').noteImages?.length===2&&!reviewImageJobs.size);
assert.equal(await p.locator('#noteBox').inputValue(),'保留文字笔记');
await p.locator('#noteBox').evaluate((el,png)=>{const bytes=Uint8Array.from(atob(png),c=>c.charCodeAt(0)),dt=new DataTransfer();dt.items.add(new File([bytes],'paste.png',{type:'image/png'}));el.dispatchEvent(new ClipboardEvent('paste',{clipboardData:dt,bubbles:true,cancelable:true}));},png);
await p.waitForFunction(()=>qs('q').noteImages?.length===3&&!reviewImageJobs.size);const removed=await p.evaluate(()=>qs('q').noteImages[0]);await p.locator('[data-act=noteImageRemove]').first().click();await p.waitForFunction(()=>document.querySelectorAll('#noteImages img').length===2);assert.equal(await p.evaluate(async key=>!!await idbReq('blobs','readonly',s=>s.get(key.slice(2))),removed),false);
await p.getByRole('tab',{name:'图片版',exact:true}).click();await p.reload();await p.locator('#githubRepo').waitFor();await p.evaluate(()=>openReview([{qid:'q'}]));await p.locator('.anaimg').waitFor();assert.equal(await p.locator('#noteBox').inputValue(),'保留文字笔记');assert.equal(await p.locator('#noteImages img').count(),2);
await p.evaluate(()=>openReview([{qid:'q2'}]));await p.getByText('这道题尚无解析原图。',{exact:false}).waitFor();await p.locator('#analysisImageIn').setInputFiles(file);await p.locator('.anaimg').waitFor();
await p.locator('#noteImageIn').setInputFiles(file);await p.waitForFunction(()=>qs('q2').noteImages?.length===1&&!reviewImageJobs.size);assert.equal(await p.evaluate(()=>bookItems(hasNote).flatMap(x=>x[1]).length),2);
const exported=await p.evaluate(async()=>{let output;const save=saveFile;try{saveFile=async(filename,data)=>output={filename,data};await exportNotesMd([{q:D.questions.get('q'),s:qs('q')}]);return output.data;}finally{saveFile=save;}});assert(exported.includes('data:image/png;base64,'));
p.on('dialog',dialog=>dialog.accept());
const complete=await p.evaluate(async()=>{let file;const save=saveFile;try{saveFile=async(name,data)=>file=JSON.parse(data);await backup();await GitHubSync.restore(file);return {noteImages:file.collections.qstate.find(x=>x.id==='q').noteImages.length,blobs:Object.keys(file.images).length};}finally{saveFile=save;}});assert.equal(complete.noteImages,2);assert(complete.blobs>=4);
const pdf=await p.evaluate(async()=>{let blob;const save=saveFile;try{saveFile=async(name,data)=>blob=data;await exportNotesPdf([{q:D.questions.get('q'),s:qs('q')}],{ana:true});const bytes=new Uint8Array(await blob.arrayBuffer());const doc=await pdfjsLib.getDocument({data:bytes}).promise;return doc.numPages;}finally{saveFile=save;}});assert(pdf>=1);
assert.deepEqual(errors,[]);console.log('PASS: text/image switching, upload/paste/remove, text preservation/reload, image-only notes, full backup, Markdown embedded images and PDF export');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exit(1)});
