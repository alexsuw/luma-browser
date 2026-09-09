// Reproducible supervised distillation of a conservative exposure policy.
import {writeFileSync} from 'node:fs';
let seed=20260909;const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
const clip=(v,a,b)=>Math.max(a,Math.min(b,v));
const target=x=>[clip((.46-x[0])*.55,-.22,.22),clip((.20-x[1])*1.8,-.15,.5),x[2]<.015?0:clip((.24-x[2])*.9,-.2,.4)];
const m={version:1,architecture:'3-16-3 tanh MLP',mean:[.5,.2,.25],scale:[.3,.15,.2],w1:Array.from({length:16},()=>Array.from({length:3},()=> (rand()-.5)*.5)),b1:Array(16).fill(0),w2:Array.from({length:3},()=>Array.from({length:16},()=> (rand()-.5)*.2)),b2:[0,0,0]};
for(let t=0;t<240000;t++){const raw=[.03+rand()*.94,rand()*.45,rand()*.65],x=raw.map((v,i)=>(v-m.mean[i])/m.scale[i]),y=target(raw),h=m.b1.map((b,j)=>Math.tanh(b+x.reduce((s,v,i)=>s+v*m.w1[j][i],0))),o=m.b2.map((b,k)=>b+h.reduce((s,v,j)=>s+v*m.w2[k][j],0)),e=o.map((v,k)=>v-y[k]),dh=h.map((v,j)=>(1-v*v)*e.reduce((s,v,k)=>s+v*m.w2[k][j],0)),lr=.014*(1-t/300000);for(let k=0;k<3;k++){m.b2[k]-=lr*e[k];for(let j=0;j<16;j++)m.w2[k][j]-=lr*e[k]*h[j];}for(let j=0;j<16;j++){m.b1[j]-=lr*dh[j];for(let i=0;i<3;i++)m.w1[j][i]-=lr*dh[j]*x[i];}}
let mse=0;for(let n=0;n<5000;n++){const x=[rand(),rand()*.45,rand()*.65],h=m.b1.map((b,j)=>Math.tanh(b+x.reduce((s,v,i)=>s+(v-m.mean[i])/m.scale[i]*m.w1[j][i],0)));m.b2.forEach((b,k)=>{const o=b+h.reduce((s,v,j)=>s+v*m.w2[k][j],0);mse+=(o-target(x)[k])**2;});}
writeFileSync('src/model.json',JSON.stringify(m));writeFileSync('docs/training.json',JSON.stringify({seed:20260909,trainingSamples:240000,validationSamples:5000,rmse:Math.sqrt(mse/15000),note:'Synthetic feature supervision; not a perceptual quality score.'},null,2)+'\n');console.log('Validation RMSE',Math.sqrt(mse/15000));
