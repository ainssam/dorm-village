// Browser acceptance coverage authored for a future real-browser run; it was not run in this workspace.
import {test,expect} from '@playwright/test';
async function mount(page){
 await page.goto('/world/astronomy/SOURCES.html');
 await page.evaluate(async()=>{
  const map=document.createElement('script');map.type='importmap';map.textContent=JSON.stringify({imports:{three:'/vendor/three.module.js','three/addons/':'/vendor/addons/'}});document.head.append(map);
  const css=document.createElement('link');css.rel='stylesheet';css.href='/style.css';const ready=new Promise((resolve,reject)=>{css.onload=resolve;css.onerror=reject;});document.head.append(css);await ready;
  const[{skyViewerHTML},{mountSkyViewer}]=await Promise.all([import('/world/sky-viewer-markup.js'),import('/world/sky-viewer.js')]);
  document.body.innerHTML='<dialog open id="inspector-qa" class="sky-viewer"></dialog>';const dialog=document.querySelector('#inspector-qa');Object.assign(dialog.style,{width:'100vw',height:'100vh',maxWidth:'100vw',maxHeight:'100vh',margin:'0',padding:'0',border:'0'});dialog.innerHTML=skyViewerHTML({variant:'telescope'});
  const skyHost=dialog.querySelector('#sky-content'),stage=dialog.querySelector('[data-sky-explorer-stage]'),explorerHost=dialog.querySelector('[data-sky-explorer-host]'),live=dialog.querySelector('[data-sky-live-status]');let inspector=null,view=null;
  function returnToSky(){inspector?.dispose();inspector=null;stage.hidden=true;skyHost.hidden=false;view?.resume();}
  view=mountSkyViewer(skyHost,{variant:'telescope',clock:()=>new Date('2026-10-12T12:00:00Z'),onExploreBody:async bodyId=>{view.suspend();skyHost.hidden=true;stage.hidden=false;live.textContent=skyHost.querySelector('[data-sky-target-status]')?.textContent??'선택한 장소와 시각의 실제 하늘 상태';const module=await import('/world/solar-system/body-inspector.js');inspector=module.mountBodyInspector(explorerHost,{bodyId,onReturn:returnToSky});}});
  window.solarInspectorQA={view,get inspector(){return inspector;},returnToSky,sameSkyCanvas:()=>dialog.querySelector('[data-sky-canvas]')===skyHost.querySelector('[data-sky-canvas]')};
 });
}
async function explore(page,bodyId){
 await page.locator('[data-sky-settings]>summary').click();await page.locator('[data-sky-target]').selectOption(bodyId);await page.locator('[data-sky-explore]').click();await expect(page.locator('[data-sky-explorer-stage]')).toBeVisible();await expect(page.locator('.solar-inspector h2')).toHaveText({Moon:'달',Mercury:'수성',Venus:'금성',Mars:'화성',Jupiter:'목성',Saturn:'토성',Uranus:'천왕성',Neptune:'해왕성'}[bodyId]);
}
for(const size of [{width:390,height:844},{width:1280,height:800}])test(`3D map opens and returns without changing sky state at ${size.width}×${size.height}`,async({page})=>{
 await page.setViewportSize(size);const requested=[];page.on('request',request=>requested.push(new URL(request.url())));await mount(page);
 await page.locator('[data-sky-settings]>summary').click();await page.locator('[data-sky-target]').selectOption('Moon');const before=await page.evaluate(()=>window.solarInspectorQA.view.snapshot());await page.locator('[data-sky-explore]').click();await expect(page.locator('.solar-inspector h2')).toHaveText('달');await expect(page.locator('[data-sky-clock]')).toBeAttached();await expect(page.locator('[data-sky-explorer-stage]')).toBeVisible();await expect(page.locator('.solar-inspector-status')).toContainText('지도 자료를 불러왔어요');
  const buffer=await page.evaluate(()=>window.solarInspectorQA.inspector.snapshot().buffer);expect(buffer.pixelWidth*buffer.pixelHeight).toBeLessThanOrEqual(1_200_000);
  await page.locator('.solar-inspector-stage canvas').focus();await page.keyboard.press('ArrowLeft');await page.locator('[data-action="zoom-in"]').click();await page.locator('[data-action="reset"]').click();await expect(page.locator('.solar-inspector-stage canvas')).toBeFocused();
  await page.locator('.solar-inspector-source>summary').click();await expect(page.locator('.solar-inspector-source')).toContainText('높이 자료');await expect(page.locator('.solar-inspector-source')).toContainText('NASA');
  const mapRequests=requested.filter(url=>url.pathname.includes('/solar-system/assets/')).map(url=>url.pathname);expect(mapRequests).toEqual(['/world/solar-system/assets/moon/lroc-color-2k.jpg']);expect(requested.every(url=>url.origin===new URL(page.url()).origin)).toBe(true);
  await page.locator('[data-action="return"]').click();await expect(page.locator('[data-sky-explorer-stage]')).toBeHidden();await expect(page.locator('[data-sky-canvas]')).toBeVisible();expect(await page.evaluate(()=>window.solarInspectorQA.sameSkyCanvas())).toBe(true);const after=await page.evaluate(()=>window.solarInspectorQA.view.snapshot());expect(after.camera).toEqual(before.camera);expect(after.targetId).toBe('Moon');expect(after.observer).toEqual(before.observer);expect(after.mode).toBe(before.mode);expect(after.suspended).toBe(false);
 await page.evaluate(()=>window.solarInspectorQA.view.dispose());
});

test('Jupiter polar blank is labeled, dated, and credited',async({page})=>{
 await mount(page);await explore(page,'Jupiter');await expect(page.locator('.solar-inspector-kind')).toContainText('대기 구름 지도');await page.locator('.solar-inspector-source>summary').click();await expect(page.locator('.solar-inspector-source')).toContainText('북위 80°');await expect(page.locator('.solar-inspector-source')).toContainText('검은 띠');await expect(page.locator('.solar-inspector-source')).toContainText('2019-06-27');await expect(page.locator('.solar-inspector-source')).toContainText('NASA, ESA, A. Simon');await expect(page.locator('.solar-inspector-source a[href="https://creativecommons.org/licenses/by/4.0/"]')).toBeVisible();await page.evaluate(()=>window.solarInspectorQA.view.dispose());
});

test('Mercury uses the small NASA MESSENGER preview with its missing-data caveat',async({page})=>{
 const requested=[];page.on('request',request=>requested.push(new URL(request.url())));await mount(page);await explore(page,'Mercury');
 await expect(page.locator('.solar-inspector-kind')).toContainText('관측 영상 모자이크');await expect(page.locator('.solar-inspector-status')).toContainText('지도 자료를 불러왔어요');
 await page.locator('.solar-inspector-source>summary').click();const source=page.locator('.solar-inspector-source');await expect(source).toContainText('97.7%');await expect(source).toContainText('5%');await expect(source).toContainText('검은 빈 구역');await expect(source).toContainText('정밀 위치 지도는 아니에요');
 expect(requested.filter(url=>url.pathname.includes('/solar-system/assets/')).map(url=>url.pathname)).toEqual(['/world/solar-system/assets/mercury/messenger-pia12397.jpg']);expect(requested.every(url=>url.origin===new URL(page.url()).origin)).toBe(true);await page.evaluate(()=>window.solarInspectorQA.view.dispose());
});

test('unsupported maps stay illustrative and failed local maps never masquerade as observations',async({page})=>{
 await mount(page);await explore(page,'Saturn');await expect(page.locator('.solar-inspector-kind')).toContainText('검증된 관측 지도 없음');await page.locator('.solar-inspector-source>summary').click();await expect(page.locator('.solar-inspector-source')).toContainText('단순화한 고리');await page.locator('[data-action="return"]').click();await page.route('**/solar-system/assets/moon/**',route=>route.abort());await explore(page,'Moon');await expect(page.locator('.solar-inspector-status')).toContainText('단색 구체만 보여요');await expect(page.locator('.solar-inspector-status')).not.toContainText('지도를 불러왔어요');await page.locator('[data-action="return"]').click();await page.evaluate(()=>window.solarInspectorQA.view.dispose());
});
