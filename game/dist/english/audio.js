import {ENGLISH_CLIPS} from './audio-manifest.js';

const CACHE_LIMIT = 8;
const idle = () => ({status: 'idle', id: null, slow: false, message: ''});
const errorMessage = '소리를 재생하지 못했어요. 다시 눌러 주세요';

/**
 * Gesture-only recorded speech on gameAudio's existing {context, output} bus.
 * The owner calls stop() on hide, blur, and close. This player owns only its
 * source/gain nodes: it never changes the shared context or output lifecycle.
 * Slow clips are preprocessed with pitch-preserving time stretching.
 */
export function createEnglishAudio({getAudio, fetch: load = globalThis.fetch, clips = ENGLISH_CLIPS} = {}) {
  if (typeof getAudio !== 'function') throw Error('EnglishAudioOptions');
  const buffers = new Map(), listeners = new Set();
  let alive = true, generation = 0, pending = null, voice = null, state = idle();
  const snapshot = () => ({...state});
  const current = request => alive && request.generation === generation;

  function deliver(listener) {
    // A detached or faulty view must not leave a voice or request uncollected.
    try { listener(snapshot()); } catch {}
  }
  function publish(next) {
    if (Object.keys(next).every(key => next[key] === state[key])) return;
    state = next;
    for (const listener of [...listeners]) if (listeners.has(listener)) deliver(listener);
  }
  function release(target, stopSource = true) {
    if (!target || target.done) return;
    target.done = true;
    if (voice === target) voice = null;
    if (target.source) {
      target.source.onended = null;
      if (stopSource) { try { target.source.stop(); } catch {} }
      try { target.source.disconnect(); } catch {}
    }
    try { target.gain?.disconnect(); } catch {}
  }
  function cancelPending() {
    const request = pending;
    pending = null;
    if (!request) return;
    request.cancel(false);
    request.abort.abort();
  }
  function stop() {
    generation++;
    cancelPending();
    release(voice);
    publish(idle());
  }
  function requireAudio(audio) {
    if (!audio?.context || !audio.output || audio.context.state !== 'running') throw Error('AudioUnavailable');
  }
  async function decoded(url, context, request) {
    const key = url.href;
    if (buffers.has(key)) {
      const buffer = buffers.get(key);
      buffers.delete(key); buffers.set(key, buffer);
      return buffer;
    }
    const response = await load(url, {signal: request.abort.signal});
    if (!current(request)) return null;
    if (!response?.ok) throw Error('EnglishAudioFetch');
    const bytes = await response.arrayBuffer();
    if (!current(request)) return null;
    const buffer = await context.decodeAudioData(bytes);
    if (!current(request)) return null;
    if (!buffer) throw Error('EnglishAudioDecode');
    buffers.set(key, buffer);
    while (buffers.size > CACHE_LIMIT) buffers.delete(buffers.keys().next().value);
    return buffer;
  }
  function startVoice(audio, buffer) {
    const target = {source: null, gain: null, done: false};
    try {
      target.source = audio.context.createBufferSource();
      target.gain = audio.context.createGain();
      target.source.buffer = buffer;
      target.source.loop = false;
      target.gain.gain.value = .8;
      target.source.connect(target.gain);
      target.gain.connect(audio.output);
      target.source.onended = () => {
        if (voice !== target) return;
        release(target, false);
        publish(idle());
      };
      voice = target;
      target.source.start();
    } catch (error) { release(target); throw error; }
  }
  async function play({id, slow = false} = {}) {
    if (!alive) return false;
    generation++;
    cancelPending();
    release(voice);
    const request = {generation, abort: new AbortController(), cancel: null};
    const cancelled = new Promise(resolve => { request.cancel = resolve; });
    pending = request;
    const selection = {id: typeof id === 'string' ? id : null, slow: !!slow};
    publish({status: 'loading', ...selection, message: ''});

    // Cancellation settles play() promptly even if unlock/decode cannot abort.
    // Each asynchronous boundary also guards against an obsolete completion.
    const work = (async () => {
      try {
        if (!current(request)) return false;
        const clip = typeof id === 'string' && Object.hasOwn(clips, id) ? clips[id] : null;
        const path = selection.slow ? clip?.slowSrc : clip?.src;
        if (typeof path !== 'string' || !path.trim()) throw Error('EnglishAudioClip');
        const url = new URL(path, import.meta.url);
        const audio = await getAudio();
        if (!current(request)) return false;
        requireAudio(audio);
        const buffer = await decoded(url, audio.context, request);
        if (!current(request)) return false;
        requireAudio(audio);
        startVoice(audio, buffer);
        publish({status: 'playing', ...selection, message: ''});
        return true;
      } catch {
        if (current(request)) publish({status: 'error', ...selection, message: errorMessage});
        return false;
      }
    })();
    try { return await Promise.race([work, cancelled]); }
    finally { if (pending === request) pending = null; }
  }

  return {
    play, stop, snapshot,
    subscribe(listener) {
      if (typeof listener !== 'function') return () => {};
      if (alive) listeners.add(listener);
      deliver(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      if (!alive) return;
      alive = false;
      stop();
      buffers.clear();
      listeners.clear();
    }
  };
}
