import {CELLO_NOTES, HARP_NOTES} from './string-audio.js';

export function stringControlsMarkup(kind) {
  if (!['cello', 'harp'].includes(kind)) throw Error('StringControlsKind');
  const cello = kind === 'cello', notes = cello ? CELLO_NOTES : HARP_NOTES;
  return `<div class="string-controls string-controls-${kind}">
    <p class="string-instruction">${cello ? '음을 고르고 활을 좌우로 움직여요' : '줄을 누르거나 옆으로 쓸어 보세요'}</p>
    <div class="string-note-grid" data-string-grid data-kind="${kind}" role="group" aria-label="${cello ? '첼로 음 고르기' : '하프 줄 여덟 개'}" style="touch-action:none">
      ${notes.map(n => `<button type="button" class="string-note string-note-${n.color}" data-color="${n.color}" data-string-note="${n.midi}" aria-label="${n.label}, 키보드 ${n.shortcut}${cello ? '' : ' 또는 ' + n.key}" aria-pressed="false" style="min-height:48px;touch-action:none"><strong>${n.label}</strong><span>${n.shortcut}${cello ? '' : ' · ' + n.key}</span></button>`).join('')}
    </div>
    ${cello ? '<div class="string-bow" data-string-bow tabindex="0" role="button" aria-label="활 켜기. 좌우로 끌거나 스페이스 또는 엔터를 누르세요" style="min-height:64px;touch-action:none"><span aria-hidden="true">← 활을 움직여요 →</span><i class="string-bow-head" data-string-bow-head aria-hidden="true"></i></div>' : ''}
    <div class="string-toolbar"><button type="button" data-string-mute aria-pressed="false" style="min-height:48px">소리 끄기</button><button type="button" data-string-stop style="min-height:48px">멈추기</button><label>음량 <input data-string-volume type="range" min="0" max="100" value="70" aria-label="${cello ? '첼로' : '하프'} 음량"></label></div>
    <p data-string-status role="status">${cello ? '활이 멈추면 소리도 쉬어요' : '빨간 도 · 파란 파'}</p>
    <p class="string-caption">${cello ? '← → 음 고르기 · Space / Enter 활 켜기' : '1–8 / A S D F G H J K로도 연주해요'}<br>${cello ? '첼로' : '하프'}의 느낌을 낸 합성 소리예요</p>
  </div>`;
}

/**
 * Attach to markup inside an already mounted, locked music workshop.
 * onNote(midi), onPluck(midi), onBow({midi,position,direction,strength,active}).
 * Bow position is 0..1, direction -1/0/1 and strength 0..1.
 * dispose stops gestures/sound but engine/context ownership stays with the caller.
 */
export function createStringControls({container, kind, engine, onNote = () => {}, onBow = () => {}, onPluck = () => {}, onClose = () => {}, isActive = () => true,
  document:doc = globalThis.document, window:win = globalThis.window, now = () => globalThis.performance?.now?.() ?? Date.now(), setTimeout:later = globalThis.setTimeout, clearTimeout:clear = globalThis.clearTimeout}) {
  if (!container || !engine || !['cello','harp'].includes(kind)) throw Error('StringControlsOptions');
  const notes = kind === 'cello' ? CELLO_NOTES : HARP_NOTES, buttons = [...container.querySelectorAll('[data-string-note]')];
  const find = name => container.querySelector(`[data-string-${name}]`), grid = find('grid'), bowEl = find('bow');
  const listeners = [], timers = new Set(), pointers = new Map(), keys = new Set();
  let alive = true, selected = 0, motion = {position:.5,direction:0,strength:0,active:false}, bowTimer = null, observer = null, suppressClickUntil = -1;
  function listen(node, type, fn) { if (!node) return; node.addEventListener(type, fn); listeners.push([node,type,fn]); }
  function schedule(fn, ms) { const id = later(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; }
  function cancel(id) { if (id === null) return; clear(id); timers.delete(id); }
  function status(text) { if (alive && find('status')) find('status').textContent = text; }
  function current() { return alive && container.isConnected !== false && !doc?.hidden && isActive(); }
  function usable() { if (current()) return true; if (alive) pause(); return false; }
  function emitBow() {
    if (find('bow-head')) find('bow-head').style.left = `${motion.position * 100}%`;
    bowEl?.setAttribute('aria-pressed',String(motion.active));
    onBow({midi:notes[selected].midi,...motion});
  }
  function stopBow() {
    cancel(bowTimer); bowTimer = null; engine.stopBow();
    if (motion.active || motion.direction) { motion = {...motion,direction:0,strength:0,active:false}; emitBow(); }
  }
  function choose(index, focus = false) {
    selected = Math.max(0,Math.min(notes.length-1,index));
    buttons.forEach(button => button.setAttribute('aria-pressed',String(Number(button.dataset.stringNote) === notes[selected].midi)));
    if (focus) buttons[selected]?.focus(); onNote(notes[selected].midi);
    status(notes[selected].label + (engine.muted ? ' · 음소거 중' : ''));
    if (kind === 'cello' && motion.active) { engine.bow(notes[selected].midi,motion.strength); emitBow(); }
  }
  function bowStroke(position, direction, strength, duration = 130) {
    if (!usable()) return;
    motion = {position,direction,strength,active:true};
    engine.bow(notes[selected].midi,strength); emitBow();
    cancel(bowTimer); bowTimer = schedule(stopBow,duration);
  }
  function pluck(index) {
    if (!usable()) return;
    choose(index); engine.pluck(notes[selected].midi,.75); onPluck(notes[selected].midi);
  }
  function release(id) {
    const pointer = pointers.get(id); if (!pointer) return;
    pointers.delete(id);
    try { pointer.element.releasePointerCapture(id); } catch {}
    if (pointer.kind === 'bow') stopBow();
  }
  function pause() {
    if (!alive) return;
    for (const id of [...pointers.keys()]) release(id);
    keys.clear(); for (const id of [...timers]) cancel(id);
    stopBow(); engine.allNotesOff(); status('멈췄어요. 다시 눌러 연주해요');
  }
  function dispose() {
    if (!alive) return; pause(); alive = false;
    for (const [node,type,fn] of listeners) node.removeEventListener(type,fn);
    listeners.length = 0; observer?.disconnect();
  }
  const noteIndex = target => {
    const button = target?.closest?.('[data-string-note]');
    return button && container.contains(button) ? notes.findIndex(n => n.midi === Number(button.dataset.stringNote)) : -1;
  };
  const xPosition = (element,x) => { const r = element.getBoundingClientRect(); return Number.isFinite(x) && r.width > 0 ? Math.max(0,Math.min(1,(x-r.left)/r.width)) : .5; };
  if (kind === 'cello') {
    listen(bowEl,'pointerdown',event => {
      if (!usable() || event.button > 0 || pointers.size) return;
      event.preventDefault(); stopBow(); const position = xPosition(bowEl,event.clientX);
      pointers.set(event.pointerId,{kind:'bow',element:bowEl,position,time:now()});
      try { bowEl.setPointerCapture(event.pointerId); } catch {}
      motion = {position,direction:0,strength:0,active:false}; emitBow();
    });
    listen(bowEl,'pointermove',event => {
      if (!usable()) return;
      const pointer = pointers.get(event.pointerId); if (!pointer || pointer.kind !== 'bow') return;
      const position = xPosition(bowEl,event.clientX), delta = position-pointer.position;
      if (Math.abs(delta) < .001) return;
      event.preventDefault(); const time = now(), speed = Math.abs(delta)/Math.max(8,time-pointer.time)*700;
      pointer.position = position; pointer.time = time;
      bowStroke(position,Math.sign(delta),Math.max(.18,Math.min(1,speed)));
    });
    for (const type of ['pointerup','pointercancel','lostpointercapture']) listen(bowEl,type,event => release(event.pointerId));
  } else {
    listen(grid,'pointerdown',event => {
      const index = noteIndex(event.target); if (!usable() || event.button > 0 || index < 0) return;
      event.preventDefault(); pointers.set(event.pointerId,{kind:'harp',element:grid,index});
      try { grid.setPointerCapture(event.pointerId); } catch {} pluck(index);
    });
    listen(grid,'pointermove',event => {
      if (!usable()) return;
      const pointer = pointers.get(event.pointerId); if (!pointer) return;
      // Pointer capture targets the grid, so measure the real buttons, including
      // wrapped mobile rows and the gaps between targets.
      const index = Number.isFinite(event.clientY) ? buttons.findIndex(button => {
        const r = button.getBoundingClientRect();
        return event.clientX >= r.left && event.clientX <= r.right && event.clientY >= r.top && event.clientY <= r.bottom;
      }) : Math.min(notes.length-1,Math.floor(xPosition(grid,event.clientX)*notes.length));
      if (index < 0) return;
      if (index === pointer.index) return; event.preventDefault();
      const step = Math.sign(index-pointer.index);
      for (let n = pointer.index+step; step > 0 ? n <= index : n >= index; n += step) pluck(n);
      pointer.index = index;
    });
    for (const type of ['pointerup','pointercancel','lostpointercapture']) listen(grid,type,event => release(event.pointerId));
  }
  listen(container,'click',event => {
    if (!usable()) return;
    const index = noteIndex(event.target); if (index < 0) return;
    if (kind === 'cello') choose(index);
    else if (event.detail === 0 && now() >= suppressClickUntil) pluck(index);
  });
  listen(doc,'keydown',event => {
    if (!usable() || event.ctrlKey || event.metaKey || event.altKey || event.isComposing || event.repeat) return;
    if (event.code === 'Escape') { event.preventDefault(); dispose(); onClose(); return; }
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(event.target?.tagName) || event.target?.isContentEditable) return;
    const index = noteIndex(event.target), activation = ['Space','Enter'].includes(event.code);
    // Let toolbar and the shared dialog's close button retain native activation.
    if (activation && event.target?.tagName === 'BUTTON' && index < 0) return;
    if (keys.has(event.code)) return;
    let chosen = notes.findIndex(n => event.code === 'Digit'+n.shortcut || (kind === 'harp' && event.code === 'Key'+n.key));
    if (kind === 'cello' && ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.code)) {
      event.preventDefault(); choose(selected + (['ArrowRight','ArrowUp'].includes(event.code) ? 1 : -1),true); return;
    }
    if (activation) {
      event.preventDefault(); keys.add(event.code); suppressClickUntil = now()+500;
      if (index >= 0) choose(index);
      if (kind === 'cello') bowStroke(motion.position < .5 ? .85 : .15,motion.position < .5 ? 1 : -1,.7,220);
      else pluck(index < 0 ? selected : index);
    } else if (chosen >= 0) {
      event.preventDefault(); keys.add(event.code);
      if (kind === 'cello') choose(chosen); else pluck(chosen);
    }
  });
  listen(doc,'keyup',event => { if (keys.delete(event.code) && kind === 'cello' && ['Space','Enter'].includes(event.code)) stopBow(); });
  listen(find('mute'),'click',() => {
    if (!usable()) return; pause(); engine.setMuted(!engine.muted);
    find('mute').setAttribute('aria-pressed',String(engine.muted)); find('mute').textContent = engine.muted ? '소리 켜기' : '소리 끄기';
    status(engine.muted ? '음소거 중이에요' : '소리를 켰어요');
  });
  listen(find('stop'),'click',() => { if (usable()) pause(); });
  listen(find('volume'),'input',event => { if (usable()) engine.setVolume(Number(event.target.value)/100); });
  listen(win,'blur',pause); listen(win,'pagehide',pause);
  listen(doc,'visibilitychange',() => { if (doc.hidden) pause(); });
  const Observer = win?.MutationObserver ?? globalThis.MutationObserver;
  if (typeof Observer === 'function' && doc?.documentElement) {
    observer = new Observer(() => { if (alive && (container.isConnected === false || !isActive())) dispose(); });
    observer.observe(doc.documentElement,{childList:true,subtree:true});
  }
  choose(0);
  return {pause,dispose,snapshot:() => ({kind,midi:notes[selected].midi,pointers:pointers.size,keys:keys.size,bowing:motion.active,alive})};
}
