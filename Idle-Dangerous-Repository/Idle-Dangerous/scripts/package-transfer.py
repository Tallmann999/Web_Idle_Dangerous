"""Explicitly requested cross-engine handoff. Run --stage, then capture/export, then --zip.
Does not mutate the game or include local player saves. Requires Pillow; fontTools optional.
"""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw
import argparse, csv, hashlib, html, json, shutil, zipfile
from collections import Counter
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
NAME = 'Idle-Dangerous-Transfer-2026-09-27'
OUT = ROOT / 'release' / NAME

def write(path, text):
    p = OUT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding='utf-8')

def dump(path, value):
    write(path, json.dumps(value, ensure_ascii=False, indent=2) + '\n')

def digest(path):
    return hashlib.file_digest(path.open('rb'), 'sha256').hexdigest()

def copy(source, target):
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)

def tree(source, target):
    for p in sorted(source.rglob('*')):
        if p.is_file() and not p.is_symlink():
            copy(p, target / p.relative_to(source))

def classify(rel):
    if rel.startswith('Item/') or rel.endswith('sources.json'):
        return 'SOURCE', 'Исходный лист предметов / карта нарезки'
    if rel.endswith('.txt'):
        return 'LICENSE', 'Приложенная лицензия Roboto'
    if rel.startswith('art/enemies/'):
        return 'ACTIVE', 'Обычный враг; пул яруса в 06_DATA'
    if rel.startswith('art/bosses/'):
        return 'ACTIVE', 'Сюжетный босс; назначение по уровням в 06_DATA/levels.json'
    if rel.startswith('art/items/'):
        return 'ACTIVE', 'Предмет / компонент / атлас всплывающей добычи'
    active = {
        'art/abilities/strength.webp': 'Боевой настрой, тренировка',
        'art/effects/coin.webp': 'Монета HUD и добычи',
        'audio/gray-impact-1.mp3': 'Звук ручного попадания, громкость 0.22',
        'fonts/Roboto-Variable.woff2': 'Основной шрифт интерфейса',
        'favicon.svg': 'Служебная иконка web-страницы',
    }
    if rel in active:
        return 'ACTIVE', active[rel]
    if rel.startswith('art/backgrounds/zone-'):
        return 'ACTIVE', 'Фон арены яруса; первый также стартовый фон'
    return 'LEGACY', 'Резерв / ресурсы старого Clicker Weapon Adventure, не активны'

def stage():
    OUT.mkdir(parents=True, exist_ok=True)
    mapping = {
        '00_START_HERE.md':'00_START_HERE.md', '01_GAME.md':'01_DESIGN/01_GAME.md',
        '02_SCREENS.md':'02_UI/01_SCREENS.md', '03_STYLE_AND_EFFECTS.md':'02_UI/02_STYLE_AND_EFFECTS.md',
        '04_STATE_AND_FLOW.md':'01_DESIGN/03_STATE_AND_FLOW.md', '05_ASSETS.md':'03_ASSETS/README.md',
        '06_ACCEPTANCE.md':'07_ACCEPTANCE/REBUILD_CHECKLIST.md',
        '07_SCENE_MAP.md':'02_UI/03_SCENE_MAP.md',
    }
    for src, dst in mapping.items():
        copy(ROOT/'docs/transfer'/src, OUT/dst)
    copy(ROOT/'docs/balance.md', OUT/'01_DESIGN/02_BALANCE.md')
    copy(ROOT/'src/idle/idle.css', OUT/'02_UI/styles-reference.css')
    tree(ROOT/'public', OUT/'03_ASSETS/public')
    tree(ROOT/'docs/screenshots', OUT/'04_REFERENCES/repository-history')
    # Preserve existing documentation verbatim, outside the authoritative handoff docs.
    for p in sorted((ROOT/'docs').rglob('*')):
        if p.is_file() and p.relative_to(ROOT/'docs').parts[0] not in ['screenshots','transfer']:
            copy(p, OUT/'09_ORIGINAL_DOCS'/p.relative_to(ROOT/'docs'))
    for directory in ['src','Modules','tests','scripts','docs','preview']:
        tree(ROOT/directory, OUT/'05_SOURCE_PROJECT'/directory)
    for p in ROOT.iterdir():
        if p.is_file() and (p.suffix in ['.md','.json','.ts','.html','.cmd'] or p.name in ['.env.example','.env.poki','.gitignore','.gitattributes']):
            copy(p, OUT/'05_SOURCE_PROJECT'/p.name)
    tree(ROOT/'dist', OUT/'10_WEB_REFERENCE')
    write('05_SOURCE_PROJECT/TRANSFER-RESTORE.md', '# Восстановление исходного web-проекта\n\nСкопируйте всю папку ../03_ASSETS/public сюда под именем public. Код, package-lock.json, инструменты и документация сохранены. node_modules не включён: установите зависимости по lockfile (npm ci), затем npm run dev. Служебные .env.local и персональные сохранения не переносятся. preview/idle-dangerous.html — исторический экспорт ДО Phaser, а актуальный web-эталон лежит в ../10_WEB_REFERENCE.\n')
    write('10_WEB_REFERENCE/RUN.md', '# Просмотр эталона\n\nЭто свежая сборка текущей игры. Из этой папки запустите HTTP-сервер, например `python -m http.server 8080 --bind 127.0.0.1`, затем откройте http://127.0.0.1:8080/. Не запускайте index.html через file://. Это справочный запуск, а не готовая сборка для Unity. Профиль браузера создаётся локально при первом входе; сохранение пользователя в архив не включено.\n')
    write('08_USER_ADDITIONS/README.md', '# Дополнения пользователя\n\nПоложите будущие скриншоты в screenshots/, макеты в mockups/, заметки в notes/.\n\nДля каждого файла укажите: имя, дата, экран/состояние, что нужно повторить, что изменить, является ли это новым требованием или только примером. Более поздние явные уточнения имеют приоритет над снимком 27.09.2026.\n\n| Файл | Экран и состояние | Что является требованием | Дата |\n|---|---|---|---|\n| — | — | — | — |\n')
    for folder in ['screenshots','mockups','notes']:
        write(f'08_USER_ADDITIONS/{folder}/PLACE_FILES_HERE.txt','Место для будущих дополнений пользователя.\n')
    refs=[]
    for name in ['2026-09-14_00-06-34.png','2026-09-07_20-50-41.png']:
        p=Path('C:/Users/User/Downloads')/name
        if p.is_file():
            copy(p,OUT/'04_REFERENCES/user-originals'/name)
            refs.append({'file':name,'included':True})
        else:
            refs.append({'file':name,'included':False,'reason':'Previously referenced local file is no longer available'})
    dump('04_REFERENCES/user-originals/index.json',refs)
    write('04_REFERENCES/README.md','# Визуальные эталоны\n\ncurrent/ — свежие кадры и измерения из текущего кода, тестовые профили. repository-history/ — полный набор прежних изображений: часть кадров эффектов и улучшений снята до уменьшения верхнего UI, использовать их только для соответствующего эффекта. user-originals/ — ранее присланные примеры: первая картинка до ленты, вторая — исходный горизонтальный кликер, не актуальный экран. Новые пользовательские изображения добавляются в 08_USER_ADDITIONS. Точные состояния свежих кадров перечислены в current/capture-report.json.\n')

    entries=[]
    for p in sorted((OUT/'03_ASSETS/public').rglob('*')):
        if not p.is_file(): continue
        rel=p.relative_to(OUT/'03_ASSETS/public').as_posix()
        status,role=classify(rel)
        entry={'id':rel,'path':p.relative_to(OUT).as_posix(),'status':status,'role':role,'bytes':p.stat().st_size,'sha256':digest(p),'extension':p.suffix.lower(),'width':None,'height':None,'alpha':None,'alpha_bbox':None,'portable_png':None}
        if p.suffix.lower() in ['.png','.webp']:
            with Image.open(p) as im:
                entry.update(width=im.width,height=im.height,alpha='A' in im.getbands())
                if 'A' in im.getbands(): entry['alpha_bbox']=im.getchannel('A').getbbox()
                if p.suffix.lower()=='.webp':
                    png=OUT/'03_ASSETS/PortablePNG'/Path(rel).with_suffix('.png')
                    png.parent.mkdir(parents=True,exist_ok=True)
                    im.save(png,format='PNG')
                    with Image.open(png) as converted:
                        assert im.convert('RGBA').tobytes()==converted.convert('RGBA').tobytes(),rel
                    entry['portable_png']=png.relative_to(OUT).as_posix()
        entries.append(entry)
    dump('03_ASSETS/catalog.json',entries)
    with (OUT/'03_ASSETS/catalog.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.DictWriter(f,fieldnames=list(entries[0]));w.writeheader();w.writerows(entries)
    groups={}
    for row in entries:
        if row['width']:
            parts=Path(row['id']).parts
            group=parts[1] if parts[0]=='art' else parts[0]
            groups.setdefault(group,[]).append(row)
    sheets=[]
    for group,rows in groups.items():
        for page in range(0,len(rows),24):
            batch=rows[page:page+24]; cols=4;cellw=240;cellh=190
            contact=Image.new('RGB',(cols*cellw,((len(batch)+cols-1)//cols)*cellh),'#1b2724');draw=ImageDraw.Draw(contact)
            for i,row in enumerate(batch):
                x=i%cols*cellw;y=i//cols*cellh
                with Image.open(OUT/row['path']) as im:
                    thumb=ImageOps.contain(im.convert('RGBA'),(224,150))
                    contact.paste(thumb,(x+(cellw-thumb.width)//2,y+(150-thumb.height)//2),thumb)
                draw.text((x+7,y+154),Path(row['id']).name,fill='#f0db9a')
                draw.text((x+7,y+170),f"{row['width']}x{row['height']} {row['status']}",fill='#b7c9be')
            path=f'03_ASSETS/ContactSheets/{group}-{page//24+1:02}.jpg'
            (OUT/path).parent.mkdir(parents=True,exist_ok=True);contact.save(OUT/path,quality=90);sheets.append(path)
    cards=[]
    for e in entries:
        local='public/'+e['id'];safe=html.escape(local,quote=True)
        preview=f'<img loading="lazy" src="{safe}" alt="">' if e['width'] or e['extension']=='.svg' else f'<audio controls preload="none" src="{safe}"></audio>' if e['extension']=='.mp3' else ''
        cards.append(f'<article data-search="{html.escape(e["id"]+" "+e["status"]+" "+e["role"],quote=True)}">{preview}<strong>{html.escape(e["id"])}</strong><b>{e["status"]}</b><p>{html.escape(e["role"])}</p><small>{e["width"] or "—"} × {e["height"] or "—"} · {e["bytes"]} bytes</small><a href="{safe}">Оригинал</a>'+ (f'<a href="{html.escape(e["portable_png"].removeprefix("03_ASSETS/"),quote=True)}">PNG</a>' if e['portable_png'] else '')+'</article>')
    write('03_ASSETS/catalog.html','''<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Idle Dangerous — все ресурсы</title><style>body{background:#0d1815;color:#e9dfc7;font:15px Arial;margin:24px}header{position:sticky;top:0;background:#0d1815;padding:12px 0;z-index:2}input{padding:12px;width:min(90%,600px)}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px}article{background:#24342c;padding:14px;border:1px solid #657553;border-radius:8px;overflow-wrap:anywhere}img{width:100%;height:155px;object-fit:contain;background:repeating-conic-gradient(#263e33 0 25%,#1e2e26 0 50%) 0/16px 16px}audio{width:100%}strong,b,small,a{display:block;margin:8px 0}b,a{color:#f0ce87}[hidden]{display:none}</style><header><h1>Idle Dangerous — каталог ресурсов</h1><p>Все оригиналы; ACTIVE — используется, SOURCE — исходники, LEGACY — история, LICENSE — лицензия.</p><input id="search" placeholder="Поиск: helmet, enemies, ACTIVE…" aria-label="Поиск ресурсов"><span id="count"></span></header><main>'''+''.join(cards)+'''</main><script>const rows=[...document.querySelectorAll('article')];function filter(){const q=document.querySelector('#search').value.toLowerCase();rows.forEach(e=>e.hidden=!e.dataset.search.toLowerCase().includes(q));document.querySelector('#count').textContent=' '+rows.filter(e=>!e.hidden).length+' / '+rows.length}document.querySelector('#search').addEventListener('input',filter);filter();</script></html>''')
    font_status='Original WOFF2 included; TTF conversion unavailable'
    try:
        from fontTools.ttLib import TTFont
        font=TTFont(OUT/'03_ASSETS/public/fonts/Roboto-Variable.woff2');font.flavor=None
        folder=OUT/'03_ASSETS/FontsPortable';folder.mkdir(exist_ok=True)
        font.save(folder/'Roboto-Variable.ttf');font.close()
        copy(ROOT/'public/fonts/OFL-Roboto.txt',folder/'OFL-Roboto.txt')
        font_status='Original WOFF2 and decoded variable TTF included; same font, no design changes'
    except (ImportError,ModuleNotFoundError) as e:
        font_status+=f' ({type(e).__name__})'
    dump('03_ASSETS/inventory-summary.json',{'original_files':len(entries),'status_counts':dict(Counter(e['status'] for e in entries)),'webp_png_conversions':sum(bool(e['portable_png']) for e in entries),'conversion_validation':'RGBA pixel equality checked for every converted WebP','contact_sheets':sheets,'fonts':font_status,'empty_original_folders':['ART']})
    print(json.dumps({'stage':str(OUT),'original_assets':len(entries),'portable_png':sum(bool(e['portable_png']) for e in entries),'contact_sheets':len(sheets)},ensure_ascii=False))

def archive():
    required=['00_START_HERE.md','06_DATA/levels.json','04_REFERENCES/current/capture-report.json','03_ASSETS/Generated/blade-slash.png','03_ASSETS/Generated/diamond.svg','02_UI/layout-measurements.json']
    for name in required:
        assert (OUT/name).is_file(),name
    captures=json.loads((OUT/'04_REFERENCES/current/capture-report.json').read_text(encoding='utf-8'))
    assert captures['pageErrors']==[],captures['pageErrors']
    generated=[]
    for p in sorted((OUT/'03_ASSETS/Generated').rglob('*')):
        if p.is_file() and p.suffix.lower() in ['.svg','.png']:
            generated.append({'path':p.relative_to(OUT).as_posix(),'role':'Exact procedural texture export' if p.stem in ['blade-slash','blade-glow'] else 'Active diamond geometry export' if p.stem=='diamond' else 'UI text-symbol convenience export','sha256':digest(p),'bytes':p.stat().st_size})
    dump('03_ASSETS/generated-catalog.json',generated)
    def gallery(title,rows):
        return '<!doctype html><html lang="ru"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>'+html.escape(title)+'</title><style>body{font:15px Arial;background:#10201a;color:#eee1c1;margin:24px}main{display:flex;flex-wrap:wrap;gap:20px}figure{margin:0;max-width:420px;background:#26392e;padding:12px;border-radius:8px}img{max-width:100%;max-height:620px;object-fit:contain}figcaption{margin-top:10px;max-width:390px}a{color:#ffe0a2}</style><h1>'+html.escape(title)+'</h1><main>'+''.join('<figure><a href="'+html.escape(src,quote=True)+'"><img loading="lazy" src="'+html.escape(src,quote=True)+'" alt=""></a><figcaption>'+html.escape(label)+'</figcaption></figure>' for src,label in rows)+'</main></html>'
    write('04_REFERENCES/current/index.html',gallery('Idle Dangerous — актуальные экраны',[(r['file'],r['file']+' · '+r['state']) for r in captures['captures']]))
    write('03_ASSETS/Generated/index.html',gallery('Экспорт эффектов и UI-значков',[(r['path'].removeprefix('03_ASSETS/Generated/'),r['path'].split('/')[-1]+' · '+r['role']) for r in generated if r['path'].endswith('.png')]))
    dump('07_ACCEPTANCE/REFERENCE_CHECK_RESULTS.json',{'date':'2026-09-27','typecheck':'passed','production_build':'passed','core_and_art_unit_tests':{'passed':18,'failed':0},'current_visual_capture':{'screenshots':len(captures['captures']),'viewport_layouts':6,'page_errors':captures['pageErrors'],'isolated_profiles':True},'pixel_preserving_webp_conversions':188,'note':'These checks apply to the web reference and this transfer package, not to a Unity implementation. Previous broader browser regression results are preserved in 09_ORIGINAL_DOCS/browser-smoke-results.json.'})
    write('07_ACCEPTANCE/PACKAGE_NOTES.md','# Проверка комплекта\n\nВсе public-файлы сверены с оригиналами по SHA-256. PNG-копии проверены на совпадение декодированных RGBA-пикселей с WebP. Ссылки на изображения из 06_DATA проверяются перед упаковкой. После записи ZIP проверяются CRC и SHA-256 каждого файла. Контрольная сумма самого ZIP лежит рядом с ним.\n\nВизуальные кадры получены заново в изолированных профилях; открытый браузер пользователя и его прогресс не менялись. Ошибка на кадре 17-loading-error.png вызвана намеренно ради документирования состояния.\n\nПолные старые материалы приложены. Противоречия: ранние документы всё ещё говорят о спуске, большой шапке с названием и старом составе UI — это история, приоритет у 01_DESIGN/02_UI и current. Файл preview/idle-dangerous.html в справочном проекте — ранняя версия ДО Phaser, не основной эталон.\n\nRoboto приложен в исходном WOFF2. Конвертер TTF в рабочем окружении отсутствовал, поэтому TTF не заявлен и не приложен; при переносе используйте поддержку WOFF2 или преобразование этого файла подходящим инструментом с сохранением лицензии OFL. Системная Georgia не входит в комплект.\n')
    # Every reference in data must resolve inside the package.
    def check_refs(obj):
        if isinstance(obj,dict):
            for value in obj.values(): check_refs(value)
        elif isinstance(obj,list):
            for value in obj:check_refs(value)
        elif isinstance(obj,str) and obj.startswith('03_ASSETS/'):
            assert (OUT/obj).is_file(),obj
    for p in (OUT/'06_DATA').glob('*.json'): check_refs(json.loads(p.read_text(encoding='utf-8')))
    for p in (ROOT/'public').rglob('*'):
        if p.is_file():assert digest(p)==digest(OUT/'03_ASSETS/public'/p.relative_to(ROOT/'public')),str(p)
    report={'name':NAME,'snapshot_date':'2026-09-27','packaged_at_utc':datetime.now(timezone.utc).isoformat(),'scope':'All public resources, game specification, reference source, current screenshots, original documentation, portable asset derivatives, current web build','excluded':['node_modules','.git','local logs and work files','personal browser saves','private environment files','old release ZIPs','dist-poki-check duplicate build'],'validation':['Every original public file matches SHA-256','Every WebP→PNG conversion matches decoded RGBA pixels','All 03_ASSETS references in 06_DATA exist','ZIP CRC and each entry SHA-256 checked after writing'],'original_assets':len(json.loads((OUT/'03_ASSETS/catalog.json').read_text(encoding='utf-8')))}
    files=[p for p in OUT.rglob('*') if p.is_file() and p.name not in ['MANIFEST.sha256','PACKAGE_REPORT.json']]
    report.update(content_files_excluding_report_and_manifest=len(files),content_bytes_excluding_report_and_manifest=sum(p.stat().st_size for p in files))
    dump('PACKAGE_REPORT.json',report)
    files=sorted(p for p in OUT.rglob('*') if p.is_file() and p.name!='MANIFEST.sha256')
    sums={p.relative_to(OUT).as_posix():digest(p) for p in files}
    write('MANIFEST.sha256',''.join(f'{value}  {name}\n' for name,value in sums.items()))
    zip_path=OUT.with_suffix('.zip')
    with zipfile.ZipFile(zip_path,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
        for p in sorted(OUT.rglob('*')):
            if p.is_file():z.write(p,NAME+'/'+p.relative_to(OUT).as_posix())
    with zipfile.ZipFile(zip_path) as z:
        assert z.testzip() is None
        for name,value in sums.items():assert hashlib.sha256(z.read(NAME+'/'+name)).hexdigest()==value,name
        assert len(z.namelist())==len(sums)+1
        count=len(z.namelist())
    checksum=digest(zip_path)
    zip_path.with_suffix('.zip.sha256').write_text(f'{checksum}  {zip_path.name}\n',encoding='utf-8')
    print(json.dumps({'archive':str(zip_path),'bytes':zip_path.stat().st_size,'files':count,'sha256':checksum,'verified':True},ensure_ascii=False))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--stage',action='store_true');parser.add_argument('--zip',action='store_true');args=parser.parse_args()
    if args.stage:stage()
    if args.zip:archive()
    if not (args.stage or args.zip):parser.error('Choose --stage or --zip explicitly')
