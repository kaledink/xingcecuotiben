const assert=require('node:assert/strict');const p=require('../answer-parser');
assert.equal(p.blockAnswer('正确答案是; D\n解析'), 'D');assert.equal(p.blockAnswer('正确答案是，A\n解析'), 'A');assert.equal(p.blockAnswer('【答案】Ａ、Ｂ，Ｃ、Ｄ\n解析'), 'ABCD');
let r=p.parse('1-3 A B C\n118.正确答案是：A, B, C, D\n解析正文\n130.正确答案是; A, B,D\n解析',{expectedNumbers:[1,2,3,118,130]});assert.deepEqual(r.ans,{1:'A',2:'B',3:'C',118:'ABCD',130:'ABD'});
r=p.parse('1-5 ACB',{expectedNumbers:[1,2,3,4,5]});assert.deepEqual(r.ans,{});assert(r.warnings.length);
r=p.parse('1.A; 2.B; 3.C\n1.【答案】D\n解析\n2.【答案】B\n解析');assert.equal(r.ans[1],undefined);assert.equal(r.ans[2],'B');assert(r.warnings.some(x=>x.includes('冲突')));
r=p.parse('118.【答案】ACD\n说明\n1. 内部论证步骤\n正文\n130.【答案】ABD\n说明',{expectedNumbers:[118,119,130]});assert.equal(r.ans[118],'ACD');assert.equal(r.ans[119],undefined);assert(r.ana[118].includes('内部论证步骤'));assert.equal(r.ans[130],'ABD');
r=p.parse('1.【答案】A\n第一版\n1.【答案】A\n重复页');assert.equal(r.ana[1],undefined);assert.equal(r.ans[1],'A');
r=p.parse('130.正确答案是: 5\n解析',{expectedNumbers:[130]});assert.equal(r.ans[130],undefined); // Never guess 5 as C.
r=p.parse('1.\n正确答案是：A\n解析\n2.【解析】解释正文',{expectedNumbers:[1,2]});assert.equal(r.ans[1],'A');assert(r.ana[2].includes('解释正文'));
r=p.parse('题号 118 119 120\n答案 ABCD ACD C');assert.equal(r.ans[118],'ABCD');assert.equal(r.ans[119],'ACD');
assert.equal(p.quality({lines:[{text:'仅有标题'},{text:'扫描页脚'},{text:'123'}]}).usable,false);assert.equal(p.quality({lines:[{text:'\ufffd'.repeat(100)}]}).usable,false);
console.log('PASS: OCR punctuation/fullwidth/multiple answers, exact table lengths, conflict detection, missing/out-of-order numbers, subpoints, duplicate analyses, no guessed letters, split headings and horizontal tables');
