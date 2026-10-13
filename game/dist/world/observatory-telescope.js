import {observerSheetHTML} from './sky-observation.js';

/** Presentation only: consume the viewer's existing immutable ephemeris. */
export const TELESCOPE_FOVS=Object.freeze([75,35,10]);
const names=Object.freeze({Moon:'달',Mercury:'수성',Venus:'금성',Mars:'화성',Jupiter:'목성',Saturn:'토성',Uranus:'천왕성',Neptune:'해왕성'});
export function telescopeTargets(snapshot){
 return (snapshot?.objects??[]).filter(o=>Object.hasOwn(names,o.id)&&(o.kind==='moon'||o.kind==='planet')).map(o=>({...o,label:names[o.id]}));
}
export function telescopeTargetStatus(target,{planetSuppressed=false}={}){
 if(!target)return '대상을 골라도 시점은 움직이지 않아요. 방향 버튼을 눌러 둘러보세요.';
 const altitude=`고도 ${target.altitudeDeg.toFixed(1)}°`,azimuth=target.azimuthDeg==null?'방위가 정해지지 않는 천정·천저':`방위 ${target.azimuthDeg.toFixed(1)}°`,phase=target.kind==='moon'?` · 밝은 비율 ${Math.round(target.illuminatedFraction*100)}% (지구 중심 기준)`:'';
 const visibility=target.limbHorizonState==='partial'?'달 일부만 지평선 위에 있어요. 실제 각크기로 지평선에 잘려 보여요.':!target.aboveHorizon?'지평선 아래에 있어 화면에 보이지 않아요. 다른 장소·시각을 골라 볼 수 있어요.':target.kind==='planet'&&planetSuppressed?'밝은 하늘에서는 행성 표식을 표시하지 않아요.': '계산상 지평선 위예요. 날씨·지형·도시 불빛에 따른 실제 가시성은 계산하지 않아요.';
 return `${target.label} · ${altitude} · ${azimuth}${phase}\n${visibility}`;
}
export function telescopeObserverSheetHTML(){
 const controls=`<section class="sky-telescope-controls" aria-label="망원경 시야와 관측 대상"><h3>어디를 바라볼까요?</h3><label>화면의 세로 시야각<select data-sky-fov aria-describedby="sky-telescope-fov-help">${TELESCOPE_FOVS.map((fov,i)=>`<option value="${fov}">${fov}° · ${['넓게','가까이','좁게'][i]}</option>`).join('')}</select></label><p id="sky-telescope-fov-help" class="sky-small">75° · 35° · 10°는 화면의 세로 시야각이에요. 실제 망원경의 광학 배율이나 촬영 화면이 아니에요.</p><label>관측 대상 · 선택 사항<select data-sky-target aria-describedby="sky-telescope-target-status"><option value="">직접 둘러보기</option></select></label><button type="button" data-sky-aim disabled>이 방향으로 보기</button><button type="button" data-sky-explore disabled aria-describedby="sky-telescope-explore-help">3D로 탐험</button><p class="sky-small" id="sky-telescope-explore-help">실제 하늘 관측을 유지한 채 지도·모형을 따로 살펴봐요.</p><p class="sky-field-status" id="sky-telescope-target-status" data-sky-target-status role="status" aria-live="polite"></p></section>`;
 // Reuse the existing location/time form and its exact accessibility/lifecycle hooks.
 return observerSheetHTML({includeSolarEvents:false})
  .replace('장소·시각 <span','망원경 · 장소·시각 <span')
  .replace('<div class="sky-settings-body">','<div class="sky-settings-body">'+controls)
  .replace(/<label>하늘 표현<select data-sky-mode>[\s\S]*?<\/select><\/label>/,'')
  .replace('별·태양·행성은 표식, 달은 확대 표식이에요. 달의 밝은 비율은 지구 중심 기준이며 표면 무늬는 연출이며 실제 크레이터 방향을 재현하지 않아요.','별과 행성은 표식이며, 달은 실제 각크기 이상의 위상 표식이에요. 지평선 근처의 달은 실제 각크기로 표시해요. 달의 밝은 비율은 지구 중심 기준이며 밝은 쪽은 계산한 태양 방향을 향해요. 달·행성의 표면이나 토성 고리, 달의 칭동은 재현하지 않아요. 태양은 화면과 대상 목록에서 제외하지만 낮의 밝기와 달 위상 계산에는 사용해요.')
  .replace('<button type="button" class="sky-settings-done"','<p class="sky-small sky-telescope-sources"><a href="https://science.nasa.gov/eclipses/safety/" target="_blank" rel="noopener">NASA · 태양 관측 안전</a><br><a href="https://science.nasa.gov/moon/moon-phases/" target="_blank" rel="noopener">NASA · 달의 위상 알아보기</a></p><button type="button" class="sky-settings-done"');
}
