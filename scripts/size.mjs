import {readdirSync,statSync,writeFileSync} from 'node:fs';
const size=p=>readdirSync(p).reduce((s,f)=>s+(statSync(`${p}/${f}`).isDirectory()?size(`${p}/${f}`):statSync(`${p}/${f}`).size),0);
const bytes=size('dist'); console.log(`Total production payload: ${bytes} bytes / 10,000,000`); if(bytes>10000000)process.exit(1);
writeFileSync('docs/size.json',JSON.stringify({bytes,limit:10000000},null,2)+'\n');
