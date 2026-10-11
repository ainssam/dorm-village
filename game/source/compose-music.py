#!/usr/bin/env python3
"""Dormi: three original, sample-free, loopable miniatures.

Deterministic local synthesis, no network or downloaded musical material.
Run: python compose_music.py [--out DIRECTORY]
Needs Python 3, numpy, scipy and ffmpeg/ffprobe (for delivery encodings).
Scores are explicitly authored below, not extracted from an existing work.
See ../dist/licenses/DormiMusic.txt and README.md for attribution and review limitations.
"""
from __future__ import annotations
import argparse
import hashlib
import json
import math
from pathlib import Path
import subprocess
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100
TAU = 2 * np.pi
SEED = 20261003


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def smooth_edge(t, duration, attack, release):
    a = np.sin(np.minimum(t / attack, 1) * np.pi / 2) ** 2
    r = np.sin(np.clip((duration - t) / release, 0, 1) * np.pi / 2) ** 2
    return a * r


def synth(kind, midi, gate, velocity, rng):
    """Return an owned procedural waveform; no external soundfonts/samples."""
    f = hz(midi)
    if kind == 'felt_keys':
        duration = gate + 1.55
        t = np.arange(round(duration * SR)) / SR
        y = np.zeros_like(t)
        # Several freely vibrating, very slightly inharmonic strings; soft hammer.
        for h, a in enumerate([1, .31, .15, .069, .031, .014], 1):
            partial = f * h * np.sqrt(1 + .000045 * h * h)
            decay = np.exp(-t / (2.2 / (h ** .73)))
            damp = np.exp(-np.maximum(0, t - gate) / (.34 + .11 / h))
            y += a * decay * damp * (.64 * np.sin(TAU * partial * t)
                 + .36 * np.sin(TAU * partial * 1.00039 * t + .045 * h))
        y *= smooth_edge(t, duration, .009, .22)
    elif kind == 'round_ep':
        duration = gate + .70
        t = np.arange(round(duration * SR)) / SR
        fm = .65 * np.exp(-t / .11) * np.sin(TAU * 2 * f * t)
        y = np.sin(TAU * f * t + fm) * np.exp(-t / 1.7)
        y += .17 * np.sin(TAU * 2 * f * t) * np.exp(-t / .30)
        y += .06 * np.sin(TAU * 3 * f * t) * np.exp(-t / .14)
        y *= np.exp(-np.maximum(t - gate, 0) / .18)
        y *= smooth_edge(t, duration, .006, .15)
    elif kind == 'wood_bell':
        duration = gate + .85
        t = np.arange(round(duration * SR)) / SR
        y = np.sin(TAU * f * t) * np.exp(-t / 1.25)
        y += .16 * np.sin(TAU * 4 * f * t) * np.exp(-t / .085)
        y += .055 * np.sin(TAU * 2 * f * t) * np.exp(-t / .24)
        y *= np.exp(-np.maximum(t - gate, 0) / .4)
        y *= smooth_edge(t, duration, .007, .17)
    elif kind == 'soft_bass':
        duration = gate + .28
        t = np.arange(round(duration * SR)) / SR
        y = (np.sin(TAU * f * t) + .16 * np.sin(TAU * 2 * f * t)
             + .035 * np.sin(TAU * 3 * f * t))
        y *= .78 * np.exp(-t / 1.7) + .22 * np.exp(-t / .10)
        y *= np.exp(-np.maximum(t - gate, 0) / .065)
        y *= smooth_edge(t, duration, .016, .07)
    elif kind == 'cloud_pad':
        duration = gate + 1.65
        t = np.arange(round(duration * SR)) / SR
        y = np.zeros_like(t)
        for cents, a, phase in [(-3.1, .34, .4), (0, .44, 1.2), (3.8, .22, 2.6)]:
            q = f * 2 ** (cents / 1200)
            y += a * (np.sin(TAU * q * t + phase)
                     + .19 * np.sin(TAU * 2 * q * t + phase)
                     + .048 * np.sin(TAU * 3 * q * t + phase))
        y *= smooth_edge(t, duration, .72, 1.9)
        y *= .94 + .06 * np.sin(TAU * .17 * t + .9)
    elif kind == 'glass_drop':
        duration = gate + 2.8
        t = np.arange(round(duration * SR)) / SR
        y = np.sin(TAU * f * t) * np.exp(-t / 1.65)
        y += .08 * np.sin(TAU * 2 * f * t) * np.exp(-t / .42)
        y += .018 * np.sin(TAU * 3 * f * t) * np.exp(-t / .13)
        y *= smooth_edge(t, duration, .032, .70)
    elif kind == 'kick':
        duration = .28
        t = np.arange(round(duration * SR)) / SR
        phase = TAU * (48 * t + 72 * .026 * (1 - np.exp(-t / .026)))
        y = np.sin(phase) * np.exp(-t / .065)
        y *= smooth_edge(t, duration, .006, .07)
    elif kind in ('brush', 'shaker'):
        duration = .19 if kind == 'brush' else .09
        t = np.arange(round(duration * SR)) / SR
        noise = rng.normal(0, 1, len(t))
        bounds = [1100, 5200] if kind == 'brush' else [3900, 8500]
        y = signal.sosfilt(signal.butter(2, bounds, btype='bandpass', fs=SR, output='sos'), noise)
        y *= np.exp(-t / (.040 if kind == 'brush' else .021))
        y *= smooth_edge(t, duration, .008, .035)
        y *= .6
    else:
        raise ValueError(kind)
    return y * velocity


class Piece:
    def __init__(self, slug, title, bpm, bars, key, mood, seed):
        self.slug, self.title, self.bpm, self.bars = slug, title, bpm, bars
        self.key, self.mood = key, mood
        self.beat = 60 / bpm
        self.n = round(bars * 4 * self.beat * SR)
        self.events = []
        self.chords = []
        self.rng = np.random.default_rng(seed)

    def add(self, kind, beat, midi, length, velocity, pan=0):
        self.events.append(dict(instrument=kind, beat=round(float(beat), 6),
                           midi=int(midi), gate_beats=float(length),
                           velocity=round(float(velocity), 5), pan=float(pan)))

    def render(self, wet, target_rms_db):
        mix = np.zeros((self.n, 2), dtype=np.float64)
        for event in self.events:
            y = synth(event['instrument'], event['midi'], event['gate_beats'] * self.beat,
                      event['velocity'], self.rng)
            start = round(event['beat'] * self.beat * SR)
            inds = (np.arange(len(y)) + start) % self.n
            # Equal-power stereo, modest range; wrapped tails make the score periodic.
            angle = (event['pan'] + 1) * np.pi / 4
            mix[inds, 0] += y * np.cos(angle)
            mix[inds, 1] += y * np.sin(angle)
        # Periodic frequency-domain mastering prevents filter startup/end transients.
        freq = np.fft.rfftfreq(self.n, 1 / SR)
        hp = (freq ** 2 / (freq ** 2 + 34 ** 2))
        lp = 1 / np.sqrt(1 + (freq / 8500) ** 8)
        for ch in range(2):
            mix[:, ch] = np.fft.irfft(np.fft.rfft(mix[:, ch]) * hp * lp, n=self.n)
        # Small, diffuse stereo room: fully procedural impulse response, circular convolution.
        wetmix = np.zeros_like(mix)
        for ch in range(2):
            irn = round(SR * 1.85)
            t = np.arange(irn) / SR
            noise = self.rng.normal(size=irn)
            tail = signal.sosfilt(signal.butter(2, 3100, fs=SR, output='sos'), noise)
            tail *= np.exp(-t / .34) * (1 - np.exp(-t / .025))
            tail /= np.sqrt(np.sum(tail * tail))
            ir = tail * .25
            for delay, amp in [(.043, .13), (.071, .10), (.113, .075), (.169, .050), (.251, .031)]:
                ir[round(SR * (delay + ch * .007))] += amp
            source = .85 * mix[:, ch] + .15 * mix[:, 1-ch]
            wetmix[:, ch] = np.fft.irfft(np.fft.rfft(source) * np.fft.rfft(ir, n=self.n), n=self.n)
        mix += wet * wetmix
        mix -= np.mean(mix, axis=0)
        rms = np.sqrt(np.mean(mix * mix))
        peak = np.max(np.abs(mix))
        gain = min(10 ** (target_rms_db / 20) / rms, 10 ** (-3.8 / 20) / peak)
        mix *= gain
        # TPDF dither for reference PCM; no limiter or clipped sample is permitted.
        dither = (self.rng.random(mix.shape) - self.rng.random(mix.shape)) / 65536
        pcm = np.rint((mix + dither) * 32767).astype(np.int16)
        return pcm, gain


def lyrical():
    p = Piece('windowlight', 'Windowlight', 88, 16, 'D major',
              'Calm lyrical piano-like miniature for home, plaza and listening', SEED)
    # Original four-phrase harmonic design. Each tuple: chord label, bass, close upper voicing.
    changes = [
      ('Dmaj9',38,[57,61,64,66]), ('Aadd9/C#',37,[57,59,64,69]),
      ('Bm7',35,[57,62,66,69]), ('Gmaj7',31,[55,59,62,66]),
      ('Em9',40,[55,59,62,66]), ('A6sus4',33,[57,62,64,66]),
      ('D6/F#',30,[57,59,62,66]), ('Gmaj9',31,[57,59,62,66]),
      ('Bm9',35,[57,61,62,66]), ('F#m7',30,[57,61,64,66]),
      ('Em9',40,[55,59,62,66]), ('Aadd9',33,[57,59,61,64]),
      ('Gmaj7',31,[55,59,62,66]), ('Dadd9/F#',30,[57,62,64,66]),
      ('Em7',40,[55,59,62,64]), ('A13',33,[55,59,61,66])]
    melody = [
      [(.5,78,.85,.34),(1.75,76,.5,.28),(2.5,74,1.15,.31)],
      [(.25,76,1.1,.32),(1.75,69,.75,.26),(3,73,.7,.28)],
      [(0,74,1.25,.33),(1.75,78,.7,.32),(3,81,.75,.30)],
      [(.5,79,.8,.29),(1.5,78,.65,.28),(2.5,74,1.0,.25)],
      [(.25,76,.65,.31),(1.25,78,.5,.29),(2,79,1.1,.33)],
      [(0,78,1.2,.31),(1.75,76,.65,.27),(3,74,.65,.25)],
      [(.5,73,.7,.27),(1.5,74,1.4,.32)],
      [(0,71,1.0,.27),(1.5,69,.55,.23),(2.5,74,.85,.29)],
      [(.25,78,.65,.33),(1.25,81,.8,.36),(2.75,78,.8,.30)],
      [(0,76,1.2,.30),(1.75,73,.7,.27),(3,69,.55,.23)],
      [(.25,71,.75,.28),(1.5,74,.55,.30),(2.5,78,.95,.33)],
      [(0,76,1.6,.29),(2.5,73,.7,.26)],
      [(.5,74,.65,.29),(1.5,71,.6,.25),(2.5,69,.8,.24)],
      [(.25,66,1,.25),(1.75,69,.6,.27),(2.75,74,.75,.31)],
      [(.25,76,.9,.28),(1.75,74,.6,.25),(2.75,71,.65,.23)],
      [(0,73,1.15,.27),(2,71,.75,.22),(3.25,69,.4,.19)]]
    for bar, (name,bass,voicing) in enumerate(changes):
        p.chords.append(name)
        b=bar*4
        p.add('felt_keys',b,bass,2.5,.24,-.13)
        p.add('felt_keys',b+2.2,bass+12,1.35,.085,-.06)
        # Sparse staggered broken-chord accompaniment, with gentle irregular breath.
        for j, offset in enumerate([.05,.80,1.55,2.35,3.10]):
            pitch=voicing[[0,2,1,3,2][j]]
            p.add('felt_keys',b+offset,pitch,1.08,.105+[0,.014,-.006,.009,-.017][j],(pitch-62)/65)
        for offset,midi,length,vel in melody[bar]:
            p.add('felt_keys',b+offset,midi,length,vel,.16)
    p.composition_notes = ['Three-note descending opening answered by a low upward turn; four related four-bar phrases.',
        'No drums. Bass, broken inner voices and separately shaped melody use a newly synthesized felt-piano-like timbre.',
        'Final A13 gently returns to Dmaj9 in a sixteen-bar 4/4 form.']
    return p, .47, -22.0


def cheerful():
    p = Piece('pocket-kites', 'Pocket Kites', 104, 16, 'F major',
              'Cheerful lightweight electronic / jazz-influenced miniature for playground, sports and listening', SEED+1)
    changes=[('Fmaj9',41,[57,60,64,67]),('Bbmaj9',34,[57,60,62,65]),
      ('Gm9',43,[57,58,62,65]),('C13',36,[58,62,64,69]),
      ('F6/9',41,[57,60,62,67]),('Dm9',38,[57,60,64,65]),
      ('Gm9',43,[57,58,62,65]),('C9sus4',36,[58,60,62,65]),
      ('Am7',33,[55,60,64,67]),('Dm9',38,[57,60,64,65]),
      ('Bbmaj9',34,[57,60,62,65]),('C13',36,[58,62,64,69]),
      ('Fmaj9/A',33,[57,60,64,67]),('Bb6',34,[55,58,62,65]),
      ('Gm9',43,[57,58,62,65]),('C13',36,[58,62,64,69])]
    melody=[
      [(0,72,.36),(1,69,.52),(2.6,67,.31),(3.1,69,.43)],
      [(.6,65,.5),(1.6,69,.35),(2.1,74,.7)],
      [(0,74,.48),(1.6,72,.31),(2.1,70,.43),(3.1,69,.41)],
      [(.6,67,.48),(1.6,64,.31),(2.6,67,.74)],
      [(0,69,.65),(1.6,72,.35),(2.1,74,.45),(3.1,72,.38)],
      [(.6,69,.52),(1.6,65,.35),(2.6,64,.65)],
      [(0,65,.43),(1,69,.5),(2.6,70,.34),(3.1,74,.47)],
      [(0,72,.85),(2.1,67,.38),(3.1,70,.4)],
      [(.6,72,.42),(1.6,76,.31),(2.1,74,.8)],
      [(0,72,.38),(1,69,.6),(2.6,65,.52)],
      [(.6,65,.5),(1.6,69,.34),(2.6,74,.67)],
      [(0,76,.39),(1,74,.52),(2.6,72,.31),(3.1,70,.42)],
      [(.6,69,.52),(1.6,67,.36),(2.1,64,.71)],
      [(0,65,.46),(1.6,67,.31),(2.1,70,.78)],
      [(0,69,.48),(1.6,65,.31),(2.1,62,.5),(3.1,65,.35)],
      [(.6,64,.52),(1.6,67,.38),(2.6,70,.4)]]
    for bar,(name,bass,voicing) in enumerate(changes):
        p.chords.append(name); b=bar*4
        for off,gain in [(.08,.095),(1.60,.077),(3.10,.070)]:
            for j,pitch in enumerate(voicing):
                p.add('round_ep',b+off+j*.011,pitch,.44,gain,-.19)
        for off,pitch,length,gain in [(0,bass,.68,.22),(1.6,bass+7,.28,.15),(2.1,bass+12,.55,.18),(3.6,bass+7,.26,.12)]:
            p.add('soft_bass',b+off,pitch,length,gain,0)
        for off,midi,length in melody[bar]:
            p.add('wood_bell',b+off,midi,length,.24 if off<2 else .22,.18)
            # A little warm electric body under the wooden tone.
            p.add('round_ep',b+off,midi,length,.066,.13)
        for off,vel in [(0,.145),(2.1,.11)]: p.add('kick',b+off,36,.2,vel,0)
        for off,vel in [(1,.12),(3,.10)]: p.add('brush',b+off,36,.1,vel,-.12)
        for j,off in enumerate([0,.6,1,1.6,2,2.6,3,3.6]):
            # Last bar leaves a small rhythmic breath at its very end.
            if bar==15 and off>=3: continue
            p.add('shaker',b+off,36,.06,.047 if j%2==0 else .032,.32)
    p.composition_notes=['Light 60% swung eighth-note accompaniment at 104 BPM, with a sparse newly authored sixteen-bar melody.',
        'Original procedural round electric keys, wooden bell, sine bass, brush, shaker and kick; no recorded drum samples.',
        'F-major extended chords and a C13 turnaround; the percussion remains deliberately quiet under the tune.']
    return p,.34,-21.0


def dreamy():
    p = Piece('afterglow-paperboats', 'Afterglow Paperboats', 68, 12, 'A major / F-sharp minor colors',
              'Dreamy soft electronic miniature for quiet rooms and listening', SEED+2)
    changes=[('Amaj9',33,[57,61,64,68,71]),('Dmaj9/A',33,[57,61,62,66,69]),
      ('F#m11',30,[57,59,61,64,68]),('Eadd9/G#',32,[56,59,64,66,71]),
      ('Bm11',35,[57,61,62,64,66]),('Dmaj9',38,[57,61,62,66,69]),
      ('Amaj9/C#',37,[57,59,61,64,68]),('E6/9',40,[56,59,61,64,66]),
      ('F#m9',30,[57,61,64,68,69]),('Dmaj9',38,[57,61,62,66,69]),
      ('Bm11',35,[57,61,62,64,66]),('E6/9',40,[56,59,61,64,66])]
    melody=[[(.75,76,1.4),(2.75,73,.8)],[(1.5,69,1.5)],
      [(.5,68,1.2),(2.5,73,1.0)],[(1,71,2.0)],
      [(.75,74,1.3),(2.75,76,.8)],[(1.0,78,1.7)],
      [(.5,76,1.1),(2.5,73,1.1)],[(1.5,71,1.65)],
      [(.5,73,1.5),(2.75,68,.8)],[(1,69,1.9)],
      [(.75,66,1.2),(2.75,69,.8)],[(1,68,1.45),(3,71,.55)]]
    for bar,(name,bass,voicing) in enumerate(changes):
        p.chords.append(name); b=bar*4
        for j,pitch in enumerate(voicing):
            p.add('cloud_pad',b-.42+j*.016,pitch,3.30,.067,[-.34,.24,-.10,.36,.04][j])
        p.add('cloud_pad',b-.20,bass,3.35,.074,0)
        # A slow irregular two-note inner shimmer, well below the foreground droplets.
        p.add('glass_drop',b+.10,voicing[2],.9,.075,-.25)
        p.add('glass_drop',b+2.15,voicing[3],.9,.058,.27)
        for off,midi,length in melody[bar]:
            p.add('glass_drop',b+off,midi,length,.19,.12)
    p.composition_notes=['A newly authored twelve-bar, low-density tune with two- and three-beat breaths.',
        'Slow additive sine-cloud chords and softly struck harmonic droplets; no drums, recordings, or external samples.',
        'The last E6/9 shares common tones with the returning Amaj9; note and reverb tails wrap across the exact loop point.']
    return p,.85,-22.0


def db(value):
    return round(20*np.log10(max(float(value),1e-12)),4)


def stats(x):
    x=np.asarray(x,dtype=np.float64)
    if x.ndim==1: x=x[:,None]
    delta=np.diff(x,axis=0)
    seam=x[0]-x[-1]
    neighborhood=np.concatenate([delta[:2048],delta[-2048:]],axis=0)
    seam_max=float(np.max(np.abs(seam)))
    ref=float(np.sqrt(np.mean(neighborhood*neighborhood)))
    block=round(.1*SR)
    a=float(np.sqrt(np.mean(x[:block]**2))); z=float(np.sqrt(np.mean(x[-block:]**2)))
    return dict(sample_frames=len(x),duration_seconds=round(len(x)/SR,9),sample_rate_hz=SR,
      channels=x.shape[1],peak_linear=round(float(np.max(np.abs(x))),9),
      peak_dbfs=db(np.max(np.abs(x))),rms_linear=round(float(np.sqrt(np.mean(x*x))),9),
      rms_dbfs=db(np.sqrt(np.mean(x*x))),
      clipped_sample_count=int(np.sum(np.abs(x)>=1)),
      dc_offset_per_channel=[float(v) for v in np.mean(x,axis=0)],
      seam=dict(boundary_step_per_channel=[float(v) for v in seam],
        maximum_boundary_step=seam_max,boundary_step_dbfs=db(seam_max),
        nearby_step_rms=ref,boundary_step_over_nearby_step_rms=round(seam_max/max(ref,1e-12),5),
        first_100ms_rms_dbfs=db(a),last_100ms_rms_dbfs=db(z),
        level_change_last_to_first_100ms_db=round(db(a)-db(z),4),
        note='The boundary step is one normal sample interval, not a requirement for zero-valued endpoints.'))


def run(cmd):
    return subprocess.run(cmd,check=True,capture_output=True,text=True)


def main():
    parser=argparse.ArgumentParser(); parser.add_argument('--out',default=str(Path(__file__).parent))
    args=parser.parse_args(); out=Path(args.out); out.mkdir(parents=True,exist_ok=True)
    collection=[]
    for factory in [lyrical,cheerful,dreamy]:
        p,wet,target=factory(); pcm,gain=p.render(wet,target)
        wav=out/(p.slug+'.wav'); wavfile.write(wav,SR,pcm)
        info=dict(id=p.slug,title=p.title,composer='AI-authored for Dormi; procedural synthesis',
          synthetic=True,original_score=True,external_samples_used=False,
          bpm=p.bpm,time_signature='4/4',bars=p.bars,key=p.key,mood=p.mood,
          loop_start_sample=0,loop_end_sample=p.n,loop_start_seconds=0,
          loop_end_seconds=p.n/SR,score_duration_seconds=p.bars*4*60/p.bpm,
          reference_pcm=stats(pcm.astype(np.float64)/32768),
          mastering_gain=gain,composition_notes=p.composition_notes,
          recommended_bgm_gain=.30,recommended_listening_gain=.7,
          review='Numerical and score review only; no supported listening/playback analysis tool was available. No claim of perceptual listening equivalence.',
          files={})
        score=dict(title=p.title,tempo_bpm=p.bpm,time_signature='4/4',bars=p.bars,
                   key=p.key,chords_by_bar=p.chords,events=p.events)
        (out/(p.slug+'.score.json')).write_text(json.dumps(score,ensure_ascii=False,indent=2)+'\n')
        for ext,codec in [('ogg',['-c:a','libvorbis','-q:a','5']),('mp3',['-c:a','libmp3lame','-b:a','160k','-write_xing','1'])]:
            dst=out/(p.slug+'.'+ext)
            run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(wav),*codec,
                 '-metadata','title='+p.title,'-metadata','artist=Dormi Original Synthetic Music',
                 '-metadata','comment=Newly authored procedural music; no external samples',str(dst)])
            raw=subprocess.run(['ffmpeg','-v','error','-i',str(dst),'-f','f32le','-acodec','pcm_f32le','-'],check=True,capture_output=True).stdout
            decoded=np.frombuffer(raw,dtype='<f4').reshape(-1,2)
            encstats=stats(decoded)
            encstats['frame_count_matches_reference']=len(decoded)==p.n
            info['files'][ext]=dict(name=dst.name,bytes=dst.stat().st_size,
                sha256=hashlib.sha256(dst.read_bytes()).hexdigest(),decoded_analysis=encstats)
        info['files']['wav']=dict(name=wav.name,bytes=wav.stat().st_size,
                 sha256=hashlib.sha256(wav.read_bytes()).hexdigest(),format='PCM signed 16-bit stereo, 44100 Hz')
        # BS.1770 EBU-R128 loudness and reconstructed true peak are measured by ffmpeg.
        result=run(['ffmpeg','-hide_banner','-nostats','-i',str(wav),'-filter_complex','ebur128=peak=true','-f','null','-'])
        (out/(p.slug+'.loudness.txt')).write_text(result.stderr)
        info['loudness_analysis_file']=p.slug+'.loudness.txt'
        collection.append(info)
        print(p.title, 'complete', info['reference_pcm'], flush=True)
    manifest=dict(collection='Dormi Original Room Music',version=1,
      source='compose-music.py',license='../dist/licenses/DormiMusic.txt',sample_rate_hz=SR,
      authorship='Newly specified AI-authored scores and entirely local procedural synthesis; no copyrighted recordings or borrowed melodies supplied or used.',
      listening_review_limitation='No supported perceptual audio-listening tool was available; objective render, spectral, loudness and loop-boundary checks do not substitute for human listening.',
      pieces=collection)
    (out/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')


if __name__=='__main__': main()
