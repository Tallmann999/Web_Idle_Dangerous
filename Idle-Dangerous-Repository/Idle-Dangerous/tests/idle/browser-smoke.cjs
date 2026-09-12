// Optional production-browser check: npm install --no-save playwright
// PLAYWRIGHT_MODULE and PLAYWRIGHT_BROWSER may point to preinstalled runtimes.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
(async()=>{
 const E=await import('../../src/idle/engine.ts');
 const root=path.resolve('dist'),captures=path.resolve('docs/screenshots');fs.mkdirSync(captures,{recursive:true});
 const errors=[],missing=[];const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(req.url.split('?')[0]).replace(/^\/embedded\/game(?=\/)/,''),file=path.join(root,pathname==='/'?'index.html':pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg'};res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{missing.push(pathname);res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_BROWSER?{executablePath:process.env.PLAYWRIGHT_BROWSER}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});page.on('pageerror',e=>errors.push(e.message));const url=`http://127.0.0.1:${server.address().port}`;
  await page.goto(url);await page.locator('.start-overlay button').click();await page.locator('canvas[data-enemy]').waitFor();await page.waitForTimeout(250);
  assert.equal(await page.locator('canvas').count(),1,'One Phaser instance after StrictMode mount');
  assert.match(await page.locator('canvas').getAttribute('data-engine'),/^Phaser 4\./);
  for(const [width,height] of [[390,844],[320,640],[360,640],[412,915],[768,1024],[1440,900]]){
   await page.setViewportSize({width,height});await page.waitForTimeout(100);
   const layout=await page.evaluate(()=>{const b=document.querySelector('.bottom-nav').getBoundingClientRect();return {width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,bottom:b.bottom,slots:[...document.querySelectorAll('.gear-slot')].map(e=>{const r=e.getBoundingClientRect();return [r.left,r.top,r.right,r.bottom];})};});
   assert.equal(layout.width,width,`horizontal overflow ${width}`);assert.equal(layout.height,height,`vertical overflow ${height}`);assert.ok(layout.bottom<=height+.5);for(const r of layout.slots)assert.ok(r[0]>=0&&r[2]<=width&&r[1]>=0&&r[3]<layout.bottom);
   if(width===390||width===320)await page.screenshot({path:path.join(captures,`combat-${width}x${height}.png`)});
  }
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Шлем, уровень 1',exact:true}).click();await page.screenshot({path:path.join(captures,'equipment-390x844.png')});
  assert.equal(await page.locator('.gear-popover').count(),1);
  await page.locator('canvas').click({position:{x:190,y:140}});assert.equal(await page.locator('.gear-popover').count(),0);
  const hpBeforeKeyboard=await page.locator('.hp-track span').textContent();
  await page.getByRole('button',{name:'Ударить монстра',exact:true}).focus();await page.keyboard.press('Space');
  assert.notEqual(await page.locator('.hp-track span').textContent(),hpBeforeKeyboard,'Keyboard attack reaches Phaser');
  await page.getByRole('button',{name:/Инвентарь/}).click();const hp=await page.locator('.hp-track span').textContent();await page.waitForTimeout(650);assert.equal(await page.locator('.hp-track span').textContent(),hp,'Inventory must pause damage');await page.getByRole('button',{name:'Закрыть окно',exact:true}).click();
  const seeded=E.fresh();seeded.gold=1000;seeded.highest=5;seeded.inventory.claw={count:7,value:19};seeded.totalKills=1;
  await page.addInitScript(({key,state})=>{if(!sessionStorage.getItem('qa-seeded')){localStorage.setItem(key,JSON.stringify(state));sessionStorage.setItem('qa-seeded','1');}},{key:E.SAVE_KEY,state:seeded});await page.reload();await page.locator('.start-overlay button').click();await page.evaluate(()=>window.dispatchEvent(new Event('mage:platform-pause')));
  await page.getByRole('button',{name:'Шлем, уровень 1',exact:true}).click();await page.getByRole('button',{name:'×10',exact:true}).click();await page.getByRole('button',{name:/Улучшить · от/}).click();await page.getByRole('button',{name:'Шлем, уровень 11',exact:true}).waitFor();await page.getByRole('button',{name:'Закрыть прокачку',exact:true}).click();
  await page.getByRole('button',{name:/В гильдию.*Выйти с добычей/}).click();await page.screenshot({path:path.join(captures,'guild-390x844.png')});
  await page.locator('.material-list article').filter({hasText:'Когти'}).getByRole('button',{name:'Сдать 5 · +5 реп.',exact:true}).click();assert.match(await page.locator('.guild-rank').textContent(),/5 реп/);assert.match(await page.locator('.guild-screen .loot-summary').textContent(),/2 шт/);
  await page.getByRole('button',{name:/Продать всю добычу/}).click();assert.match(await page.locator('.guild-screen .loot-summary').textContent(),/0 шт/);
  await page.reload();await page.locator('.start-overlay button').click();assert.equal(await page.locator('.guild-screen').count(),1);assert.match(await page.locator('.guild-screen .loot-summary').textContent(),/0 шт/);
  await page.getByRole('button',{name:/Спуститься · комната/}).click();await page.locator('.depth-header button').click();await page.getByRole('button',{name:/Комната 5.*Босс · 30 секунд/}).click();assert.equal(await page.locator('.boss-timer').count(),1);
  await page.getByRole('button',{name:/В гильдию.*Выйти с добычей/}).click();await page.getByRole('button',{name:/Спуститься · комната 5/}).click();assert.match(await page.locator('.boss-timer').textContent(),/30.0|29.8|29.6/);
  await page.locator('.depth-header button').click();await page.screenshot({path:path.join(captures,'path-390x844.png')});

  async function scenario(state, options={}, suffix='') {
   const context=await browser.newContext({viewport:{width:390,height:844},...options});
   await context.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:E.SAVE_KEY,state});
   const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
   await p.goto(url+suffix);await p.locator('.start-overlay button').click();await p.locator('canvas[data-enemy]').waitFor();
   await p.locator('.arena-loading').waitFor({state:'detached'});
   return {p,context};
  }
  // Navigate on the same Phaser instance, including an evicted and a cached region.
  const explored=E.fresh();explored.highest=105;
  const art=await scenario(explored);
  for(const room of [11,26,41,56,76,1,11,1]) {
   await art.p.locator('.depth-header button').click();
   await art.p.getByRole('button',{name:new RegExp(`^${room} Комната ${room} `)}).click();
   const region=E.layer(room).region;
   await art.p.waitForFunction(r=>document.querySelector('canvas')?.dataset.region===String(r),region);
   await art.p.locator('.arena-loading').waitFor({state:'detached'});
   assert.equal(await art.p.locator('canvas').count(),1);
   assert.match(await art.p.locator('canvas').getAttribute('data-enemy'),new RegExp(`region-${region}-`));
   if(room>1)await art.p.waitForTimeout(250);
   if(room>1)await art.p.screenshot({path:path.join(captures,`phaser-region-${region}.png`)});
  }
  // SDK pause must stop the actual Phaser combat clock and resume without catch-up.
  await art.p.evaluate(()=>window.dispatchEvent(new Event('mage:platform-pause')));
  const pausedHp=await art.p.locator('.hp-track span').textContent();
  await art.p.waitForTimeout(750);assert.equal(await art.p.locator('.hp-track span').textContent(),pausedHp);
  await art.p.evaluate(()=>window.dispatchEvent(new Event('mage:platform-resume')));
  await art.p.waitForFunction(old=>document.querySelector('.hp-track span').textContent!==old,pausedHp,{timeout:5000});
  await art.context.close();

  const weak=E.fresh();weak.hp=1;
  const touch=await scenario(weak,{hasTouch:true,isMobile:true});
  const beforeEnemy=await touch.p.locator('canvas').getAttribute('data-enemy');
  const bounds=await touch.p.locator('canvas').boundingBox();
  await touch.p.touchscreen.tap(bounds.x+bounds.width/2,bounds.y+150);
  await touch.p.waitForFunction(old=>document.querySelector('canvas')?.dataset.enemy!==old,beforeEnemy);
  const killed=await touch.p.evaluate(key=>JSON.parse(localStorage.getItem(key)),E.SAVE_KEY);
  assert.equal(killed.totalKills,1);assert.equal(killed.gold,3);
  await touch.context.close();

  const champion=E.fresh();champion.highest=5;champion.room=5;champion.clickLevel=100;
  assert.ok(E.clickDamage(champion)>E.hpMax(champion));
  const victory=await scenario(champion);
  await victory.p.locator('canvas').click({position:{x:194,y:155}});
  await victory.p.locator('.victory-flash').waitFor();
  await victory.p.screenshot({path:path.join(captures,'phaser-boss-victory.png')});
  const won=await victory.p.evaluate(key=>JSON.parse(localStorage.getItem(key)),E.SAVE_KEY);
  assert.deepEqual(won.defeated,[5]);assert.equal(won.room,4);assert.equal(won.highest,6);
  assert.equal(E.lootCount(won),3);
  await victory.context.close();

  const challenger=E.fresh();challenger.room=5;challenger.highest=5;
  const timeout=await scenario(challenger);
  await timeout.p.getByRole('dialog',{name:'Попытка босса завершена'}).waitFor({timeout:40000});
  assert.equal(await timeout.p.getByRole('button',{name:/Смотреть рекламу/}).count(),0);
  await timeout.p.getByRole('button',{name:'Повторить · 30 секунд',exact:true}).click();
  assert.match(await timeout.p.locator('.boss-timer').textContent(),/30.0|29.8|29.6/);
  await timeout.context.close();
  const embedded=await scenario(E.fresh(),{},'/embedded/game/');
  assert.match(await embedded.p.locator('canvas').getAttribute('data-engine'),/^Phaser 4/);
  await embedded.context.close();

  // An asset failure pauses gameplay and can be retried without duplicating Phaser.
  const recoveryContext=await browser.newContext({viewport:{width:390,height:844}});
  let failedOnce=false;
  await recoveryContext.route('**/art/enemies/region-1-01.webp',route=>{
   if(!failedOnce){failedOnce=true;return route.fulfill({status:503,body:'unavailable'});}
   return route.continue();
  });
  const recovery=await recoveryContext.newPage();recovery.on('pageerror',e=>errors.push(e.message));
  await recovery.goto(url);await recovery.locator('.start-overlay button').click();
  await recovery.getByRole('button',{name:'Повторить загрузку',exact:true}).waitFor();
  const unloadedHp=await recovery.locator('.hp-track span').textContent();
  await recovery.waitForTimeout(500);assert.equal(await recovery.locator('.hp-track span').textContent(),unloadedHp);
  await recovery.getByRole('button',{name:'Повторить загрузку',exact:true}).click();
  await recovery.locator('canvas[data-enemy]').waitFor();await recovery.locator('.arena-loading').waitFor({state:'detached'});
  assert.equal(await recovery.locator('canvas').count(),1);await recoveryContext.close();

  // Emulate a browser with no WebGL support and exercise the Canvas renderer.
  const fallbackContext=await browser.newContext({viewport:{width:390,height:844}});
  await fallbackContext.addInitScript(()=>{
   const original=HTMLCanvasElement.prototype.getContext;
   HTMLCanvasElement.prototype.getContext=function(type,...args){
    if(type==='webgl'||type==='webgl2'||type==='experimental-webgl')return null;
    return original.call(this,type,...args);
   };
  });
  const fallback=await fallbackContext.newPage();fallback.on('pageerror',e=>errors.push(e.message));
  await fallback.goto(url);await fallback.locator('.start-overlay button').click();
  await fallback.locator('canvas[data-enemy]').waitFor();
  assert.equal(await fallback.locator('canvas').getAttribute('data-renderer'),'Canvas');
  const fallbackHp=await fallback.locator('.hp-track span').textContent();
  await fallback.locator('canvas').click({position:{x:194,y:150}});
  assert.notEqual(await fallback.locator('.hp-track span').textContent(),fallbackHp);
  await fallback.screenshot({path:path.join(captures,'phaser-canvas-fallback.png')});await fallbackContext.close();
  assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);
  const result={status:'passed',engine:'Phaser 4.2.1',viewports:['390×844','320×640','360×640','412×915','768×1024','1440×900'],checks:['one Phaser canvas','no page overflow','8 visible side slots','equipment popup','Phaser pointer closes popup','keyboard attack','inventory pauses combat','bulk equipment purchase','guild exit','contract consumes 5','sell all','reload retains guild and inventory','boss navigation','boss exit and reentry','all six regions and texture cache revisit','SDK pause and resume','touch kills and rotates enemy','boss victory saves reward once','boss timeout and free retry','subdirectory hosting','asset error pause and retry','Canvas renderer fallback'],pageErrors:errors,missingAssets:missing};
  fs.writeFileSync('docs/browser-smoke-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
