const {chromium}=require('playwright-core');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{const p=await b.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(process.env.BASE_URL||'http://127.0.0.1:8000/');await p.locator('#githubRepo').waitFor();
const pdf64=await p.evaluate(async()=>{
await dbPut('papers','p',{title:'识别核对测试',qCount:2,createdAt:1,modules:[]});await dbPut('questions','q1',{pid:'p',n:1,module:'常识判断',answer:'B',analysis:'old analysis'});await dbPut('questions','q2',{pid:'p',n:2,module:'常识判断',answer:'C',analysis:'old analysis'});await loadData();render();
const pdf=new jspdf.jsPDF({unit:'pt',format:[600,800]});pdf.text('1. A',30,12);pdf.text('Explanation for question one. Native text should be preserved with its original numbered heading.',30,40);pdf.text('2. C',30,200);pdf.text('Explanation for question two. This is an independent analysis and must not shift to another number.',30,230);return btoa(String.fromCharCode(...new Uint8Array(pdf.output('arraybuffer'))));
});
const chooser=p.waitForEvent('filechooser');await p.locator('[data-act=reAns]').click();await(await chooser).setFiles({name:'answers.pdf',mimeType:'application/pdf',buffer:Buffer.from(pdf64,'base64')});await p.locator('#answerReviewApply').waitFor();
assert.equal(await p.locator('[data-answer-review="1"]').inputValue(),'A');assert.equal(await p.locator('[data-answer-use="1"]').isChecked(),false);assert.equal(await p.evaluate(()=>D.questions.get('q1').answer),'B');
await p.locator('#answerReviewApply').click();await p.waitForFunction(()=>D.questions.get('q1').analysis.includes('Native text'));assert.equal(await p.evaluate(()=>D.questions.get('q1').answer),'B');
// Explicit opt-in is required before changing an existing standard answer.
await p.evaluate(()=>{window.importReview=reviewAnswerImport(parseAnswers('1.【答案】A\n解析文字'),[D.questions.get('q1')]);});
await p.locator('[data-answer-use="1"]').check();await p.locator('[data-answer-review="1"]').fill('5');await p.locator('#answerReviewApply').click();await p.locator('#answerReviewError').filter({hasText:'有效'}).waitFor();await p.locator('[data-answer-review="1"]').fill('AB');await p.locator('#answerReviewApply').click();assert.equal(await p.evaluate(async()=>(await importReview).ans[1]),'AB');
// Mixed PDF: one valid text page, one scanned page with a short native header.
const mixed=await p.evaluate(async()=>{
const pdf=new jspdf.jsPDF({unit:'pt',format:[600,800]});pdf.setFontSize(10);pdf.text('1. A',40,40);pdf.text('This native explanation is intentionally long enough to verify the existing text layer and avoid OCR on page one.',40,70);
pdf.addPage();pdf.text('SCAN HEADER',40,30);const c=document.createElement('canvas');c.width=1200;c.height=700;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,c.width,c.height);x.fillStyle='black';x.font='48px Arial';x.fillText('2. B',40,100);x.fillText('Explanation for the scanned answer.',40,200);x.fillText('Read each question by its printed number.',40,300);pdf.addImage(c.toDataURL('image/png'),'PNG',20,60,560,327);
const doc=await pdfjsLib.getDocument({data:new Uint8Array(pdf.output('arraybuffer'))}).promise;const full=await pdfFullText(doc);return {answers:parseAnswers(full.txt,{expectedNumbers:[1,2]}).ans,ocr:full.pages.map(x=>!!x.ocr),text:full.txt};
});assert.equal(mixed.answers[1],'A');assert.equal(mixed.answers[2],'B');assert.deepEqual(mixed.ocr,[false,true]);assert(mixed.text.includes('1. A\n'));
// Two columns must be read by column, not interleaved row by row.
const columns=await p.evaluate(async()=>{
const pdf=new jspdf.jsPDF({unit:'pt',format:[600,800]});pdf.setFontSize(10);for(let i=0;i<3;i++){for(const [col,offset]of [[0,0],[1,3]]){const x=col?330:25,y=40+i*100,n=i+offset+1;pdf.text(`${n}. ${['A','B','C','D','A','B'][n-1]}`,x,y);pdf.text(`Explanation number ${n} in its own column.`,x,y+20);}}
const doc=await pdfjsLib.getDocument({data:new Uint8Array(pdf.output('arraybuffer'))}).promise;const full=await pdfFullText(doc),r=parseAnswers(full.txt,{expectedNumbers:[1,2,3,4,5,6]});return {starts:splitAnalysis(full.txt).starts.map(x=>x.n),answers:r.ans,regions:anaRegions(full.pages,full.map,r.spans)};
});assert.deepEqual(columns.starts,[1,2,3,4,5,6]);assert.equal(columns.answers[4],'D');assert(columns.regions[1][0].x1<330);assert(columns.regions[4][0].x0>300);assert.deepEqual(errors,[]);
console.log('PASS: actual PDF import review, preserves existing answers without opt-in, rejects invalid letters, retains page-top headings/newlines, per-page OCR of mixed PDF, column ordering and matching image crops');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
