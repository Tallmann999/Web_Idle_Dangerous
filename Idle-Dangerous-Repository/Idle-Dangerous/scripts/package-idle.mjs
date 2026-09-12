// Dependency-free ZIP packaging of the production web build (Node 22+).
import {readFileSync,readdirSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,relative} from 'node:path';
import {deflateRawSync} from 'node:zlib';
const mode=process.argv[2]==='poki'?'poki':'local';
const table=Array.from({length:256},(_,i)=>{for(let j=0;j<8;j++)i=(i>>>1)^((i&1)?0xedb88320:0);return i>>>0;});
const crc=data=>{let c=0xffffffff;for(const byte of data)c=(c>>>8)^table[(c^byte)&255];return (c^0xffffffff)>>>0;};
const walk=dir=>readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e=>e.isDirectory()?walk(join(dir,e.name)):[join(dir,e.name)]);
const files=walk('dist');if(!files.includes(join('dist','index.html')))throw new Error('Build dist/index.html first');
const content=[],directory=[];let offset=0;
for(const file of files){const name=Buffer.from(relative('dist',file).replaceAll('\\','/')),raw=readFileSync(file),data=deflateRawSync(raw),sum=crc(raw);
 const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(8,8);h.writeUInt16LE(0x21,12);h.writeUInt32LE(sum,14);h.writeUInt32LE(data.length,18);h.writeUInt32LE(raw.length,22);h.writeUInt16LE(name.length,26);
 const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(8,10);c.writeUInt16LE(0x21,14);c.writeUInt32LE(sum,16);c.writeUInt32LE(data.length,20);c.writeUInt32LE(raw.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);
 content.push(h,name,data);directory.push(c,name);offset+=h.length+name.length+data.length;
}
const central=Buffer.concat(directory),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(central.length,12);end.writeUInt32LE(offset,16);mkdirSync('release',{recursive:true});const target=`release/idle-dangerous-${mode}.zip`;writeFileSync(target,Buffer.concat([...content,central,end]));console.log(`${target}: ${files.length} files`);
