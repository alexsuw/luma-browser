import {features,infer,correct} from './core.js';
import model from './model.json';
import {dimensions} from './dimensions.js';
const report=(status,progress,extra={})=>postMessage({status,progress,...extra});
const limit=(w,h)=>{if(!w||!h||w*h>15000000)throw new Error('Изображение превышает 15 Мп');};
self.onmessage=async({data:{input,options,decoderURL}})=>{try{
 report('loading',2);let blob;
 if(typeof input==='string'){const u=new URL(input,location.href);if(!['http:','https:','blob:'].includes(u.protocol))throw new Error('Недопустимый URL');const response=await fetch(u);if(!response.ok)throw new Error(`HTTP ${response.status}`);const reader=response.body.getReader(),parts=[];let total=0;for(;;){const {done,value}=await reader.read();if(done)break;total+=value.length;if(total>50000000){await reader.cancel();throw new Error('Файл превышает 50 МБ');}parts.push(value);}blob=new Blob(parts);}else blob=input instanceof Blob?input:new Blob([input]);
 if(!blob.size||blob.size>50000000)throw new Error('Размер файла должен быть от 1 байта до 50 МБ');
 const head=new Uint8Array(await blob.slice(0,32).arrayBuffer()),tag=String.fromCharCode(...head.slice(4,12));
 const heic=tag.startsWith('ftyp');const standard=(head[0]===255&&head[1]===216)||(head[0]===137&&head[1]===80&&head[2]===78&&head[3]===71)||(head[0]===66&&head[1]===77);
 if(!heic&&!standard)throw new Error('Поддерживаются JPG, PNG, BMP и HEIC');
 if(standard){const size=dimensions(await blob.arrayBuffer());if(size)limit(...size);}
 report('decoding',10);let canvas,ctx;
 if(heic){const {default:factory}=await import(/* @vite-ignore */ decoderURL);const lib=await factory();const decoder=new lib.HeifDecoder();const images=decoder.decode(new Uint8Array(await blob.arrayBuffer()));try{if(!images.length)throw new Error('Не удалось декодировать HEIC');const img=images[0],w=img.get_width(),h=img.get_height();limit(w,h);const pixels=new ImageData(w,h);await new Promise((resolve,reject)=>img.display(pixels,v=>v?resolve():reject(new Error('Ошибка HEIC'))));canvas=new OffscreenCanvas(w,h);ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.putImageData(pixels,0,0);}finally{images.forEach(i=>i.free());}}
 else{const bitmap=await createImageBitmap(blob);try{limit(bitmap.width,bitmap.height);canvas=new OffscreenCanvas(bitmap.width,bitmap.height);ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(bitmap,0,0);}finally{bitmap.close();}}
 const originalPreview=heic?await canvas.convertToBlob({type:'image/png'}):undefined;
 report('analyzing',25);const w=canvas.width,h=canvas.height,small=new OffscreenCanvas(Math.min(w,256),Math.max(1,Math.round(h*Math.min(w,256)/w))),sc=small.getContext('2d',{willReadFrequently:true});sc.drawImage(canvas,0,0,small.width,small.height);const f=features(sc.getImageData(0,0,small.width,small.height).data),p=infer(f,model);if(f[2]<.015)p.saturation=1;
 const strength=options.strength;p.brightness*=strength;p.contrast=1+(p.contrast-1)*strength;p.saturation=1+(p.saturation-1)*strength;
 for(let y=0;y<h;y+=128){const rows=Math.min(128,h-y),pixels=ctx.getImageData(0,y,w,rows);correct(pixels.data,p);ctx.putImageData(pixels,0,y);report('processing',30+Math.round(55*(y+rows)/h));}
 report('encoding',90);if(options.type==='image/jpeg'){ctx.globalCompositeOperation='destination-over';ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);}
 const result=await canvas.convertToBlob({type:options.type,quality:options.quality});report('completed',100,{result,originalPreview,parameters:p,width:w,height:h});
 }catch(e){report('failed',0,{error:e.message||'Ошибка обработки'});}};
