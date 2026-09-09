export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function features(data){
 let sum=0,sq=0,sat=0,n=0; const step=Math.max(1,Math.floor(data.length/4/65536))*4;
 for(let i=0;i<data.length;i+=step){if(data[i+3]<128)continue;const r=data[i]/255,g=data[i+1]/255,b=data[i+2]/255,y=.2126*r+.7152*g+.0722*b;sum+=y;sq+=y*y;sat+=Math.max(r,g,b)-Math.min(r,g,b);n++;}
 if(!n)return [.5,.2,0];const mean=sum/n;return [mean,Math.sqrt(Math.max(0,sq/n-mean*mean)),sat/n];
}
export function infer(x,m){
 const h=m.b1.map((b,j)=>Math.tanh(b+x.reduce((s,v,i)=>s+(v-m.mean[i])/m.scale[i]*m.w1[j][i],0)));
 const o=m.b2.map((b,k)=>b+h.reduce((s,v,j)=>s+v*m.w2[k][j],0));
 return {brightness:clamp(o[0],-.22,.22),contrast:clamp(1+o[1],.85,1.5),saturation:clamp(1+o[2],.8,1.4)};
}
export function correct(data,p,start=0,end=data.length){
 const lut=new Float32Array(256);for(let i=0;i<256;i++)lut[i]=((i/255-.5)*p.contrast+.5+p.brightness)*255;
 for(let i=start;i<end;i+=4){const r=lut[data[i]],g=lut[data[i+1]],b=lut[data[i+2]],y=.2126*r+.7152*g+.0722*b;data[i]=clamp(y+(r-y)*p.saturation,0,255);data[i+1]=clamp(y+(g-y)*p.saturation,0,255);data[i+2]=clamp(y+(b-y)*p.saturation,0,255);}
}
