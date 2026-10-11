const STEPS = [0, 2, 4, 5, 7, 9, 11, 12];
const NAMES = ['도', '레', '미', '파', '솔', '라', '시', '도'];
const LETTERS = ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K'];
const scale = base => Object.freeze(STEPS.map((step, i) => Object.freeze({
  midi: base + step, label: NAMES[i] + (Math.floor((base + step) / 12) - 1),
  shortcut: String(i + 1), key: LETTERS[i], color: i === 0 || i === 7 ? 'red' : i === 3 ? 'blue' : 'natural'
})));
export const CELLO_NOTES = scale(48);
export const HARP_NOTES = scale(60);
const unit = (value, fallback = .7) => Number.isFinite(Number(value)) ? Math.max(0, Math.min(1, Number(value))) : fallback;
const frequency = midi => 440 * 2 ** ((midi - 69) / 12);

/**
 * Approximate string synthesis using the gesture-owned shared audio bus.
 * getAudio() returns {context, output}; this engine never creates, resumes,
 * closes, or disconnects that shared context/output. isActive guards late unlocks.
 * bow()/pluck() resolve to whether the gesture actually obtained a voice.
 */
export function createStringAudio({kind, getAudio, onError = () => {}, isActive = () => true, maxVoices = 8}) {
  if (!['cello', 'harp'].includes(kind) || typeof getAudio !== 'function') throw Error('StringAudioOptions');
  const allowed = new Set((kind === 'cello' ? CELLO_NOTES : HARP_NOTES).map(n => n.midi));
  const limit = kind === 'cello' ? 1 : Math.max(1, Math.min(8, Math.floor(Number(maxVoices)) || 8));
  const voices = new Set(), pendingPlucks = new Set();
  let alive = true, muted = false, volume = .7, generation = 0, nextId = 0;
  let wantedBow = null, bowVoice = null, bowRequest = null;
  const available = () => alive && !muted && isActive();
  const valid = midi => Number.isInteger(midi) && allowed.has(midi);

  function kill(voice) {
    if (!voice || voice.done) return;
    voice.done = true; voices.delete(voice);
    if (bowVoice === voice) bowVoice = null;
    for (const node of voice.sources) { node.onended = null; try { node.stop(); } catch {} }
    for (const node of voice.nodes) { try { node.disconnect(); } catch {} }
  }
  function own(voice, node, source = false) {
    voice.nodes.push(node); if (source) voice.sources.push(node); return node;
  }
  function oscillator(voice, ratio, amplitude) {
    const c = voice.context, t = c.currentTime;
    const osc = own(voice, c.createOscillator(), true), gain = own(voice, c.createGain());
    osc.type = 'sine'; osc.frequency.setValueAtTime(frequency(voice.midi) * ratio, t);
    gain.gain.setValueAtTime(amplitude, t); osc.connect(gain); gain.connect(voice.filter);
    voice.harmonics.push({osc, ratio});
    return osc;
  }
  function setBow(voice, desired) {
    const t = voice.context.currentTime;
    voice.midi = desired.midi; voice.velocity = desired.velocity;
    for (const {osc, ratio} of voice.harmonics) osc.frequency.setTargetAtTime(frequency(voice.midi) * ratio, t, .025);
    voice.filter.frequency.setTargetAtTime(1100 + desired.velocity * 1800, t, .03);
    voice.envelope.gain.setTargetAtTime(.16 * desired.velocity, t, .025);
  }
  function makeVoice(audio, midi, velocity) {
    if (!audio?.context || !audio.output || audio.context.state === 'closed' || audio.context.state === 'suspended') throw Error('AudioUnavailable');
    while (voices.size >= limit) kill(voices.values().next().value);
    const c = audio.context, t = c.currentTime;
    const v = {context:c, midi, velocity, nodes:[], sources:[], harmonics:[], done:false};
    try {
      v.filter = own(v, c.createBiquadFilter());
      v.envelope = own(v, c.createGain());
      v.level = own(v, c.createGain());
      v.filter.type = 'lowpass'; v.filter.Q.setValueAtTime(.55, t);
      v.filter.frequency.setValueAtTime(kind === 'cello' ? 2000 : 6200, t);
      v.level.gain.setValueAtTime(volume, t);
      v.filter.connect(v.envelope); v.envelope.connect(v.level); v.level.connect(audio.output);
      for (const [ratio, gain] of kind === 'cello' ? [[1,.63],[2,.2],[3,.1],[4,.055]] : [[1,.72],[2,.18],[3,.07]]) oscillator(v, ratio, gain);
      if (kind === 'cello') {
        // Quiet filtered friction underneath the harmonic bank, not a recording.
        const noise = own(v, c.createBufferSource(), true), noiseGain = own(v, c.createGain());
        const friction = own(v, c.createBiquadFilter());
        const buffer = c.createBuffer(1, Math.max(1, Math.floor(c.sampleRate * .12)), c.sampleRate);
        const samples = buffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
        noise.buffer = buffer; noise.loop = true; noiseGain.gain.setValueAtTime(.045, t);
        friction.type = 'bandpass'; friction.frequency.setValueAtTime(1300, t); friction.Q.setValueAtTime(.7, t);
        noise.connect(friction); friction.connect(noiseGain); noiseGain.connect(v.filter);
        v.envelope.gain.setValueAtTime(.0001, t); setBow(v, {midi,velocity});
      } else {
        v.envelope.gain.setValueAtTime(.0001, t);
        v.envelope.gain.linearRampToValueAtTime(.24 * velocity, t + .008);
        v.envelope.gain.exponentialRampToValueAtTime(.0001, t + 2.8);
        v.filter.frequency.exponentialRampToValueAtTime(900, t + 2.4);
      }
      voices.add(v);
      // An ended source cleans the entire logical voice, including all harmonics.
      v.sources[0].onended = () => kill(v);
      for (const source of v.sources) {
        source.start(t);
        // A safety cap also bounds a broken/stale caller's held cello voice.
        source.stop(t + (kind === 'cello' ? 30 : 2.85));
      }
      return v;
    } catch (error) { kill(v); throw error; }
  }
  async function bow(midi, velocity = .7) {
    if (kind !== 'cello' || !valid(midi) || !available()) return false;
    wantedBow = {midi, velocity:Math.max(.05, unit(velocity))};
    if (bowVoice && !bowVoice.done) { setBow(bowVoice, wantedBow); return true; }
    if (bowRequest) return bowRequest.promise;
    const request = {generation, promise:null}; bowRequest = request;
    request.promise = (async () => {
      try {
        const audio = await getAudio();
        if (!available() || generation !== request.generation || bowRequest !== request || !wantedBow) return false;
        bowVoice = makeVoice(audio, wantedBow.midi, wantedBow.velocity); return true;
      } catch {
        if (alive && generation === request.generation && isActive()) onError('소리가 준비되지 않았어요. 활을 다시 움직여 주세요');
        return false;
      } finally { if (bowRequest === request) bowRequest = null; }
    })();
    return request.promise;
  }
  async function pluck(midi, velocity = .7) {
    if (kind !== 'harp' || !valid(midi) || !available()) return false;
    const request = {generation, id:++nextId}; pendingPlucks.add(request);
    // Pending unlocks are bounded too: an old gesture may not replace newer notes.
    while (pendingPlucks.size > limit) pendingPlucks.delete(pendingPlucks.values().next().value);
    try {
      const audio = await getAudio();
      if (!available() || generation !== request.generation || !pendingPlucks.has(request)) return false;
      makeVoice(audio, midi, Math.max(.05, unit(velocity))); return true;
    } catch {
      if (alive && generation === request.generation && pendingPlucks.has(request) && isActive()) onError('소리가 준비되지 않았어요. 줄을 다시 눌러 주세요');
      return false;
    } finally { pendingPlucks.delete(request); }
  }
  function allNotesOff() {
    generation++; wantedBow = null; bowRequest = null; pendingPlucks.clear();
    for (const voice of [...voices]) kill(voice);
  }
  return {
    bow, pluck, stopBow() { if (kind === 'cello') allNotesOff(); }, allNotesOff,
    setMuted(value) { muted = !!value; allNotesOff(); },
    setVolume(value) {
      volume = unit(value, 0);
      for (const voice of voices) voice.level.gain.setTargetAtTime(volume, voice.context.currentTime, .02);
    },
    get muted() { return muted; }, get volume() { return volume; },
    snapshot: () => ({kind, voices:voices.size, pending:pendingPlucks.size + Number(!!bowRequest), midi:wantedBow?.midi ?? null, muted, volume, alive}),
    dispose() { if (!alive) return; alive = false; allNotesOff(); }
  };
}
