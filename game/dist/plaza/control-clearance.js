/** Align above the real action row; no assumed phone size or fixed row count. */
export function placeCampSeatControls(panel,stage,doc){
 if(!panel||panel.hidden||panel.dataset.mode!=='seat')return;
 const actions=doc?.querySelector?.('.bottom-controls .action-area'),area=stage?.getBoundingClientRect?.(),box=actions?.getBoundingClientRect?.();
 if(!area||!box||actions.hidden||!(box.width>0&&box.height>0))return;
 const value=Math.ceil(Math.max(12,area.bottom-box.top+12))+'px';
 if(panel.style?.getPropertyValue?.('--camp-seat-bottom')!==value)panel.style?.setProperty?.('--camp-seat-bottom',value);
}
