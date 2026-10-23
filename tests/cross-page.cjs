const {chromium}=require('playwright-core');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});try{const p=await b.newPage();await p.goto(process.env.BASE_URL||'http://127.0.0.1:8000/');await p.locator('#githubRepo').waitFor();const result=await p.evaluate(async()=>{
const line=(text,top)=>({text,c:text,x0:20,x1:500,top,y:top+12});
const pages=[{w:600,h:800,lines:[line('6.题干',700),line('A.第一页选项',730)]},{w:600,h:800,lines:[line('B.页顶选项',4),line('C.页顶选项',25),line('D.页顶选项',46),line('7.下一题',200)]},{w:600,h:800,lines:[line('最后一道题的跨页内容',4)]}];
const st={firstNum:6,head:.12,foot:.95,modules:[],markers:[{type:'q',page:0,y:700,num:6},{type:'q',page:1,y:200,num:7}]};
const r=buildRegions(pages,st),text=regionText(pages,r.qs[0].slices);
const pdf=new jspdf.jsPDF({unit:'pt',format:[600,800]});pdf.text('6. Question A.',20,710);pdf.addPage();pdf.setFillColor(255,0,0);pdf.rect(20,2,100,8,'F');pdf.setTextColor(0);pdf.text('B. Option C. Option D. Option',20,30);pdf.text('7. Next question',20,210);
const doc=await pdfjsLib.getDocument({data:new Uint8Array(pdf.output('arraybuffer'))}).promise;
const slice=r.qs[0].slices[1],full=await renderPageCanvas(await doc.getPage(2),1),crop=document.createElement('canvas');crop.width=full.width;crop.height=slice.bot-slice.top;crop.getContext('2d').drawImage(full,0,-slice.top);
return {text,nextTop:slice.top,nextBottom:slice.bot,pixel:[...crop.getContext('2d').getImageData(25,6,1,1).data],lastPages:r.qs[1].slices.map(x=>x.page)};
});assert(result.text.includes('B.页顶选项'));assert(result.text.includes('C.页顶选项'));assert(result.text.includes('D.页顶选项'));assert(!result.text.includes('7.下一题'));assert.equal(result.nextTop,0);assert.equal(result.nextBottom,198);assert.deepEqual(result.pixel,[255,0,0,255]);assert.deepEqual(result.lastPages,[1,2]);console.log('PASS: cross-page B/C/D text and real PDF pixels retained above header band; next question excluded; final question spans remaining pages');}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
