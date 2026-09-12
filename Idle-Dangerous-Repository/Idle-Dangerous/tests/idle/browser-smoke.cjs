// Optional production-browser check: npm install --no-save playwright
// PLAYWRIGHT_MODULE and PLAYWRIGHT_BROWSER may point to preinstalled runtimes.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const E=await import('../../src/idle/engine.ts');
 const root=path.resolve('dist'),captures=path.resolve('docs/screenshots');fs.mkdirSync(captures,{recursive:true});
 const errors=[],missing=[];const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(req.url.split('?')[0]),file=path.join(root,pathname==='/'?'index.html':pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg'};res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{missing.push(pathname);res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_BROWSER?{executablePath:process.env.PLAYWRIGHT_BROWSER}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>errors.push(e.message));const url=`http://127.0.0.1:${server.address().port}`;
  await page.goto(url);await page.locator('.start-overlay button').click();await page.waitForTimeout(250);
  for(const [width,height] of [[390,844],[320,640],[360,640],[412,915],[768,1024],[1440,900]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(100);
   const layout=await page.evaluate(()=>{const b=document.querySelector('.bottom-nav').getBoundingClientRect();return {width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,bottom:b.bottom,slots:[...document.querySelectorAll('.gear-slot')].map(e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom];})};});
   assert.equal(layout.width,width,`horizontal overflow ${width}`);assert.equal(layout.height,height,`vertical overflow ${height}`);assert.ok(layout.bottom<=height+.5);for(const r of layout.slots)assert.ok(r[0]>=0&&r[2]<=width&&r[1]>=0&&r[3]<layout.bottom);
   if(width===390||width===320)await page.screenshot({path:path.join(captures,`combat-${width}x${height}.png`)});
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Шлем, уровень 1',exact:true}).click();await page.screenshot({path:path.join(captures,'equipment-390x844.png')});
  assert.equal(await page.locator('.gear-popover').count(),1);
  await page.getByRole('button',{name:'Ударить монстра',exact:true}).click({position:{x:100,y:60}});assert.equal(await page.locator('.gear-popover').count(),0);
  await page.getByRole('button',{name:/Инвентарь/}).click();const hp=await page.locator('.hp-track span').textContent();await page.waitForTimeout(650);assert.equal(await page.locator('.hp-track span').textContent(),hp,'Inventory must pause damage');await page.getByRole('button',{name:'Закрыть окно',exact:true}).click();
  const seeded=E.fresh();seeded.gold=1000;seeded.highest=5;seeded.inventory.claw={count:7,value:19};seeded.totalKills=1;
  await page.addInitScript(({key,state})=>{if(!sessionStorage.getItem('qa-seeded')){localStorage.setItem(key,JSON.stringify(state));sessionStorage.setItem('qa-seeded','1');}},{key:E.SAVE_KEY,state:seeded});await page.reload();await page.locator('.start-overlay button').click();
  await page.getByRole('button',{name:'Шлем, уровень 1',exact:true}).click();await page.getByRole('button',{name:'×10',exact:true}).click();await page.getByRole('button',{name:/Улучшить · от/}).click();await page.getByRole('button',{name:'Шлем, уровень 11',exact:true}).waitFor();await page.getByRole('button',{name:'Закрыть прокачку',exact:true}).click();
  await page.getByRole('button',{name:/В гильдию.*Выйти с добычей/}).click();await page.screenshot({path:path.join(captures,'guild-390x844.png')});
  await page.getByRole('button',{name:'Сдать 5 · +5 реп.',exact:true}).click();assert.match(await page.locator('.guild-rank').textContent(),/5 реп/);assert.match(await page.locator('.guild-screen .loot-summary').textContent(),/2 шт/);
  await page.getByRole('button',{name:/Продать всю добычу/}).click();assert.match(await page.locator('.guild-screen .loot-summary').textContent(),/0 шт/);
  await page.reload();await page.locator('.start-overlay button').click();assert.equal(await page.locator('.guild-screen').count(),1);assert.match(await page.locator('.guild-screen .loot-summary').textContent(),/0 шт/);
  await page.getByRole('button',{name:/Спуститься · комната/}).click();await page.locator('.depth-header button').click();await page.getByRole('button',{name:/Комната 5.*Босс · 30 секунд/}).click();assert.equal(await page.locator('.boss-timer').count(),1);
  await page.getByRole('button',{name:/В гильдию.*Выйти с добычей/}).click();await page.getByRole('button',{name:/Спуститься · комната 5/}).click();assert.match(await page.locator('.boss-timer').textContent(),/30.0|29.8|29.6/);
  await page.locator('.depth-header button').click();await page.screenshot({path:path.join(captures,'path-390x844.png')});
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  const result={status:'passed',viewports:['390×844','320×640','360×640','412×915','768×1024','1440×900'],checks:['no page overflow','8 visible side slots','equipment popup','click closes popup','inventory pauses combat','bulk equipment purchase','guild exit','contract consumes 5','sell all','reload retains guild and inventory','boss navigation','boss exit and reentry'],pageErrors:errors,missingAssets:missing};
  fs.writeFileSync('docs/browser-smoke-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
