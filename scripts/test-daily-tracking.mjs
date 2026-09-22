import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import ts from 'typescript';
const code = ts.transpileModule(fs.readFileSync('app/api/dashboard/daily-tracking/route.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const fixtures = {
 User: [{id:'a',name:'Asha'},{id:'b',name:'Bilal'},{id:'c',name:'Charu'}],
 LegalRecoveryPayment: [{id:1,amount:'1200.50',bankName:'Bank A',paymentDate:'2026-09-18T00:00:00Z',createdAt:'2026-09-18T04:00:00Z',receivedBy:'a'}],
 LegalSecurityPayment: [{id:1,amount:'500',nbfcName:'Client B',paymentDate:'2026-09-18',createdAt:'2026-09-18T05:00:00Z',receivedBy:'b'}],
 Attendance: [{employee:'a',status:'Present',checkIn:'2026-09-18T04:30:00Z'},{employee:'b',status:'Late',checkIn:'2026-09-18T05:30:00Z'}],
 SodReport: [{employee:'a',createdAt:'2026-09-18T06:00:00Z'},{employee:'c',createdAt:'2026-09-18T06:00:00Z'},{employee:'c',createdAt:'2026-09-18T04:00:00Z'}],
 TaskLog: [{id:'T1',employee:'b',assignedBy:'a',taskTitle:'Collect receipt',createdAt:'2026-09-18T04:00:00Z'}],
 AuditLog: [{id:'F1',entityId:'T1',user:'b',timestamp:'2026-09-18T06:00:00Z',details:JSON.stringify({changes:[{field:'forwardedTo',before:'a',after:'c'}]})},{id:'F2',entityId:'T1',user:'c',details:JSON.stringify({changes:[{field:'status',before:'Pending',after:'Done'}]})}]
};
let role = 'Owner', fail = '';
const queries = {};
const exportsObject = {};
vm.runInNewContext(code, {exports:exportsObject, Request, URL, Date, Intl, console:{error(){}}, require(id){
 if(id==='next/server') return {NextResponse:{json:(body,options)=>({body,status:options?.status||200})}};
 if(id==='sequelize') return {Op:{gte:Symbol.for('gte'),lt:Symbol.for('lt')}};
 if(id==='@/lib/apiAuth') return {requireApiSession:async()=>({session:{user:{role}},response:null})};
 const model = id.split('/').pop();
 return {default:{findAll:async options=>{queries[model]=options; if(fail===model) throw Error('unavailable'); return fixtures[model];}}};
}});
(async()=>{
 const get = date => exportsObject.GET(new Request('http://localhost/api/dashboard/daily-tracking?date='+date));
 let result = await get('2026-09-18');
 assert.equal(result.status,200);
 const d = result.body.data;
 assert.equal(d.payments.reduce((s,p)=>s+p.amount,0),1700.5);
 assert.equal(d.payments[0].receivedBy,'Bilal');
 assert.equal(d.attendance.length,3);
 assert.equal(d.attendance.filter(p=>p.late).length,1);
 assert.equal(d.tasks[0].creator,'Asha');
 assert.equal(d.forwards.length,1);
 assert.equal(d.forwards[0].from,'Bilal');
 assert.equal(d.forwards[0].to,'Charu');
 assert.equal(queries.TaskLog.where.createdAt[Symbol.for('gte')].toISOString(),'2026-09-17T18:30:00.000Z');
 assert.equal(queries.TaskLog.where.createdAt[Symbol.for('lt')].toISOString(),'2026-09-18T18:30:00.000Z');
 assert.equal((await get('2026-02-30')).status,400);
 role='Department Manager'; assert.equal((await get('2026-09-18')).status,403);
 role='Employee'; assert.equal((await get('2026-09-18')).status,403);
 role='HR Executive'; fail='LegalSecurityPayment'; result=await get('2026-09-18');
 assert.equal(result.body.data.paymentsAvailable,false);
 assert.equal(result.body.data.attendanceAvailable,true);
 assert.equal(result.body.data.errors.length,1);
 console.log('PASS: receipt totals, user resolution, deduplicated attendance, late cutoff, task creator, forward actor/recipient, IST day boundaries, date validation, role restrictions, partial failures');
})().catch(error=>{console.error(error);process.exitCode=1});
