#!/usr/bin/env python3
"""Two original, sample-free DORMI listening loops.

Run: python compose-extra-music.py --out ./rendered
Requires Python 3, numpy, scipy, ffmpeg and ffprobe.
No network, soundfonts, recorded samples, AI music API, or external melodies.
New scores are written out as MIDI-pitch event JSON, not rendered MIDI samples.
"""
from __future__ import annotations
import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess
import numpy as np
from scipy import signal
from scipy.io import wavfile

SR = 44100
TAU = 2 * np.pi
SEED = 20261004
LIMITATION = ('Numerical and score review only. No supported perceptual audio-listening tool was available; '
              'the tracks have not been auditioned by this agent. Objective checks do not establish subjective musical quality '
              'or guarantee seamless playback in every browser.')


def db(value):
    return round(float(20 * np.log10(max(float(value), 1e-12))), 5)


def hz(midi):
    return 440 * 2 ** ((midi - 69) / 12)


def edges(t, duration, attack, release):
    return (np.sin(np.minimum(t / attack, 1) * np.pi / 2) ** 2 *
            np.sin(np.clip((duration - t) / release, 0, 1) * np.pi / 2) ** 2)


def pulse(f, t, duty=.25, ceiling=7800):
    """Band-limited pulse train: Fourier series, zero DC, no oscillator aliasing."""
    y = np.zeros_like(t)
    for k in range(1, min(32, int(ceiling / f)) + 1):
        a = 2 * np.sin(np.pi * k * duty) / (np.pi * k)
        y += a * np.cos(TAU * k * f * t - np.pi * k * duty)
    return y


def synth(kind, midi, gate, velocity, rng):
    f = hz(midi)
    if kind in ('nylon_pluck', 'folk_bass'):
        bass = kind == 'folk_bass'
        duration = gate + (.38 if bass else .62)
        t = np.arange(round(duration * SR)) / SR
        y = np.zeros_like(t)
        # String-mode additive model: the pick position changes upper partials,
        # and high modes damp faster. Everything is synthesized, including body color.
        position = .22 if bass else .28
        for k in range(1, 17):
            if f * k > 8600:
                break
            a = np.sin(np.pi * k * position) / (k ** (1.42 if bass else 1.23))
            q = f * k * np.sqrt(1 + .000014 * k * k)
            decay = np.exp(-t / ((1.6 if bass else 1.38) / k ** .63))
            y += a * decay * np.sin(TAU * q * t + .015 * k)
        # Brief low-level body resonances: a warm wooden box, no recorded impulse.
        for q, a in [(102, .025), (207, .022), (380, .009)]:
            y += a * np.sin(TAU * q * t) * np.exp(-t / .073)
        y *= np.exp(-np.maximum(t - gate, 0) / (.10 if bass else .19))
        y *= edges(t, duration, .0045, .16)
    elif kind == 'wood_tap':
        duration = .115
        t = np.arange(round(duration * SR)) / SR
        y = .40 * np.sin(TAU * 690 * t) * np.exp(-t / .014)
        y += .22 * np.sin(TAU * 1165 * t) * np.exp(-t / .010)
        noise = signal.sosfilt(signal.butter(2, [800, 2600], btype='bandpass', fs=SR, output='sos'), rng.normal(size=len(t)))
        y += .10 * noise * np.exp(-t / .018)
        y *= edges(t, duration, .002, .045)
    elif kind in ('pulse_lead', 'chip_arp'):
        duration = gate + .055
        t = np.arange(round(duration * SR)) / SR
        y = pulse(f, t, .25 if kind == 'pulse_lead' else .50,
                  7400 if kind == 'pulse_lead' else 5200)
        # Rectangular colors remain audible, with rounded attacks and gentle decay.
        y *= .80 + .20 * np.exp(-t / .065)
        y *= np.exp(-np.maximum(t - gate, 0) / .012)
        y *= edges(t, duration, .006, .030)
    elif kind == 'triangle_bass':
        duration = gate + .055
        t = np.arange(round(duration * SR)) / SR
        y = np.zeros_like(t)
        for k in range(1, 20, 2):
            y += (-1) ** ((k - 1) // 2) * np.sin(TAU * f * k * t) / k ** 2
        y *= np.exp(-np.maximum(t - gate, 0) / .012)
        y *= edges(t, duration, .005, .035)
    elif kind == 'chip_kick':
        duration = .19
        t = np.arange(round(duration * SR)) / SR
        y = np.sin(TAU * (50 * t + 68 * .018 * (1 - np.exp(-t / .018))))
        y *= np.exp(-t / .048) * edges(t, duration, .0035, .035)
    elif kind in ('chip_hat', 'chip_snare'):
        duration = .068 if kind == 'chip_hat' else .145
        t = np.arange(round(duration * SR)) / SR
        # Deterministic two-level digital noise resembles an 8-bit noise channel.
        source = rng.choice([-1., 1.], size=len(t))
        source = np.repeat(source[::3], 3)[:len(t)]
        band = [3500, 7300] if kind == 'chip_hat' else [650, 5400]
        y = signal.sosfilt(signal.butter(2, band, btype='bandpass', fs=SR, output='sos'), source)
        y *= np.exp(-t / (.014 if kind == 'chip_hat' else .028))
        if kind == 'chip_snare':
            y += .20 * np.sin(TAU * 170 * t) * np.exp(-t / .025)
        y *= edges(t, duration, .0025, .025)
    else:
        raise ValueError(kind)
    return y * velocity


class Piece:
    def __init__(self, slug, title, bpm, bars, beats_per_bar, key, genre, mood, seed):
        self.slug, self.title, self.bpm, self.bars = slug, title, bpm, bars
        self.beats_per_bar, self.key, self.genre, self.mood = beats_per_bar, key, genre, mood
        self.beat = 60 / bpm
        self.n = round(bars * beats_per_bar * self.beat * SR)
        self.events, self.chords, self.notes = [], [], []
        self.seed = seed

    def add(self, instrument, beat, midi, length, velocity, pan=0):
        self.events.append(dict(instrument=instrument, beat=round(float(beat), 6), midi=int(midi),
                               gate_beats=float(length), velocity=round(float(velocity), 6), pan=float(pan)))

    def render(self, wet, target_rms_db, cutoff):
        rng = np.random.default_rng(self.seed)
        mix = np.zeros((self.n, 2), dtype=np.float64)
        for event in self.events:
            y = synth(event['instrument'], event['midi'], event['gate_beats'] * self.beat, event['velocity'], rng)
            inds = (np.arange(len(y)) + round(event['beat'] * self.beat * SR)) % self.n
            angle = (event['pan'] + 1) * np.pi / 4
            mix[inds, 0] += y * np.cos(angle)
            mix[inds, 1] += y * np.sin(angle)
        # Filtering the periodic buffer itself avoids startup/end transients.
        freq = np.fft.rfftfreq(self.n, 1 / SR)
        shape = freq ** 2 / (freq ** 2 + 34 ** 2) / np.sqrt(1 + (freq / cutoff) ** 8)
        for ch in range(2):
            mix[:, ch] = np.fft.irfft(np.fft.rfft(mix[:, ch]) * shape, n=self.n)
        # Quiet synthetic room/delay, entirely circular, so tails cross the seam.
        wetmix = np.zeros_like(mix)
        for ch in range(2):
            irn = round(SR * 1.15)
            t = np.arange(irn) / SR
            tail = signal.sosfilt(signal.butter(2, 2500, fs=SR, output='sos'), rng.normal(size=irn))
            tail *= np.exp(-t / .22) * (1 - np.exp(-t / .018))
            tail /= np.sqrt(np.sum(tail * tail))
            ir = tail * .11
            for delay, amp in [(.037, .12), (.081, .075), (.131, .049), (.223, .027)]:
                ir[round(SR * (delay + ch * .005))] += amp
            source = .88 * mix[:, ch] + .12 * mix[:, 1 - ch]
            wetmix[:, ch] = np.fft.irfft(np.fft.rfft(source) * np.fft.rfft(ir, n=self.n), n=self.n)
        mix += wet * wetmix
        mix -= np.mean(mix, axis=0)
        gain = min(10 ** (target_rms_db / 20) / np.sqrt(np.mean(mix * mix)),
                   10 ** (-3.8 / 20) / np.max(np.abs(mix)))
        mix *= gain
        dither = (rng.random(mix.shape) - rng.random(mix.shape)) / 65536
        pcm = np.rint((mix + dither) * 32767).astype(np.int16)
        return pcm, float(gain)


def folk_waltz():
    p = Piece('clover-waltz', 'Clover Waltz', 72, 16, 3, 'G major',
              'Warm plucked-string folk waltz', 'Gentle, cozy and lightly swaying', SEED)
    changes = [
        ('G', 43, [55, 59, 62]), ('D/F#', 42, [54, 57, 62]),
        ('Em7', 40, [55, 59, 62]), ('Cadd9', 36, [55, 60, 62]),
        ('Am7', 45, [55, 60, 64]), ('D7', 38, [54, 60, 62]),
        ('G/B', 35, [55, 59, 62]), ('D', 38, [54, 57, 62]),
        ('Em', 40, [55, 59, 64]), ('Bm7', 35, [54, 57, 62]),
        ('Cmaj7', 36, [55, 59, 64]), ('G/B', 35, [55, 59, 62]),
        ('Am7', 45, [55, 60, 64]), ('Cadd9', 36, [55, 60, 62]),
        ('D7sus4', 38, [55, 60, 62]), ('D7', 38, [54, 60, 62]),
    ]
    # New 4-phrase melody, with a small pickup shape and a different middle answer.
    # Tuples are (beat offset, MIDI pitch, gate beats); all pitches explicitly authored.
    melody = [
        [(.25, 71, .58), (1, 74, .66), (2, 69, .72)],
        [(.20, 69, .58), (1, 66, 1.30)],
        [(0, 67, .68), (.9, 71, .67), (2, 74, .70)],
        [(.25, 76, .72), (1.25, 74, 1.15)],
        [(.15, 72, .60), (1, 71, .60), (2, 69, .66)],
        [(0, 66, 1.30), (1.75, 69, .75)],
        [(.20, 71, .62), (1, 67, 1.27)],
        [(1, 69, .52), (2, 66, .60)],
        [(0, 71, .57), (.75, 74, .56), (1.50, 76, 1.00)],
        [(.20, 74, .65), (1.2, 69, 1.17)],
        [(0, 67, .63), (.85, 71, .70), (2, 76, .65)],
        [(.2, 74, 1.25), (1.85, 71, .73)],
        [(0, 72, .63), (1, 76, .60), (2, 74, .68)],
        [(.2, 72, .70), (1.2, 67, 1.22)],
        [(0, 69, .7), (1, 67, .65), (2, 66, .65)],
        [(.1, 69, 1.02), (1.55, 66, .66), (2.45, 69, .31)],
    ]
    for bar, (name, bass, chord) in enumerate(changes):
        p.chords.append(name)
        b = bar * 3
        p.add('folk_bass', b, bass, .91, .28, -.08)
        # Bass, plucked chord, plucked chord: deliberately 3/4, never swung jazz.
        for beat, loudness in [(1.0, .090), (2.0, .070)]:
            for j, note in enumerate(chord):
                p.add('nylon_pluck', b + beat + j * .022, note, .74, loudness * (1 - .07 * j), -.26 + j * .08)
        # Occasional inner moving string connects the chords without filling all the space.
        if bar in (2, 6, 8, 10, 12, 14):
            p.add('nylon_pluck', b + 2.50, chord[1] + 12, .31, .059, -.18)
        for j, (offset, note, length) in enumerate(melody[bar]):
            p.add('nylon_pluck', b + offset, note, length, [.31, .28, .27][j], .22)
        for beat in (1, 2):
            p.add('wood_tap', b + beat, 60, .08, .027 if beat == 1 else .021, -.11)
    p.notes = [
        'A newly authored sixteen-bar melody in G major, in four related four-bar phrases.',
        'Warm procedural nylon-like plucks carry both melody and chord accompaniment; separate plucked bass and tiny wood taps mark a 3/4 folk sway.',
        'The last D7 turns back to the opening G. All note and room tails wrap across the exact 40-second loop.',
        'Synthetic plucked-string timbres, not a recording of a real guitar or mandolin.',
    ]
    return p, .42, -23.5, 7000


def chiptune():
    p = Piece('pixel-parade', 'Pixel Parade', 100, 16, 4, 'C major',
              'Playful retro 8-bit / chiptune', 'Bright, playful and gently bouncy', SEED + 1)
    changes = [
        ('C', 36, [60, 64, 67]), ('G/B', 35, [59, 62, 67]),
        ('Am', 33, [60, 64, 69]), ('F', 29, [60, 65, 69]),
        ('Dm', 38, [62, 65, 69]), ('G', 31, [59, 62, 67]),
        ('C/E', 40, [60, 64, 67]), ('G', 31, [59, 62, 67]),
        ('F', 29, [60, 65, 69]), ('C/E', 40, [60, 64, 67]),
        ('Dm', 38, [62, 65, 69]), ('Am', 33, [60, 64, 69]),
        ('F', 29, [60, 65, 69]), ('Dm', 38, [62, 65, 69]),
        ('G7', 31, [59, 62, 65]), ('G', 31, [59, 62, 67]),
    ]
    melody = [
        [(0, 76, .38), (.5, 72, .38), (1.5, 79, .38), (2.5, 76, .38), (3, 74, .73)],
        [(0, 74, .71), (1, 71, .38), (1.5, 74, .38), (2.5, 79, .94)],
        [(0, 76, .70), (1, 81, .38), (1.5, 79, .38), (2.5, 76, .38), (3, 72, .72)],
        [(.5, 77, .38), (1, 76, .38), (2, 72, 1.19)],
        [(0, 74, .38), (.5, 77, .38), (1.5, 81, .70), (2.5, 77, .38), (3.5, 76, .32)],
        [(0, 74, .72), (1.5, 71, .38), (2, 67, .38), (3, 74, .72)],
        [(0, 76, .38), (.5, 79, .38), (1.5, 76, .70), (2.5, 72, .89)],
        [(1, 71, .38), (1.5, 74, .38), (2.5, 79, .74)],
        [(0, 81, .69), (1, 79, .38), (1.5, 77, .38), (2.5, 76, .38), (3, 72, .73)],
        [(0, 79, .38), (.5, 76, .38), (1.5, 72, .70), (3, 76, .73)],
        [(.5, 77, .38), (1, 81, .38), (2, 77, .38), (2.5, 74, .93)],
        [(0, 76, .72), (1.5, 72, .38), (2.5, 69, 1.05)],
        [(0, 72, .38), (.5, 77, .38), (1.5, 81, .69), (2.5, 79, .38), (3, 77, .73)],
        [(.5, 74, .38), (1, 77, .38), (2, 76, .38), (2.5, 74, .96)],
        [(0, 71, .69), (1, 74, .38), (1.5, 77, .38), (2.5, 74, .38), (3, 71, .69)],
        [(0, 74, .70), (1.5, 71, .38), (2.5, 67, .70), (3.5, 71, .32)],
    ]
    for bar, (name, bass, chord) in enumerate(changes):
        p.chords.append(name)
        b = bar * 4
        # Separate triangle bass channel, with straight rhythmic movement.
        for j, off in enumerate([0, .75, 1.5, 2, 2.75, 3.5]):
            p.add('triangle_bass', b + off, bass + (12 if j in (1, 4) else 0), .38, .21 if j in (0, 3) else .15, 0)
        # Quick upper arpeggios are a distinctive chip sound, placed in short bursts.
        for step in range(16):
            if step in (6, 7, 14, 15):
                continue
            note = chord[[0, 2, 1, 2][step % 4]]
            p.add('chip_arp', b + step * .25, note, .165, .071 if step % 4 == 0 else .052, -.24)
        for j, (off, note, length) in enumerate(melody[bar]):
            p.add('pulse_lead', b + off, note, length, .20 if j == 0 else .18, .20)
        for off in (0, 2):
            p.add('chip_kick', b + off, 36, .1, .092, 0)
        for off in (1, 3):
            p.add('chip_snare', b + off, 60, .1, .055, -.10)
        for j in range(8):
            p.add('chip_hat', b + j * .5, 60, .05, .030 if j % 2 else .020, .20)
    p.notes = [
        'A newly authored sixteen-bar C-major tune with an A/A-variation/B/turnaround shape, at a straight 100 BPM.',
        'Band-limited 25-percent pulse melody, 50-percent pulse chord arpeggios, triangle bass and quiet digitally synthesized noise drums.',
        'The timbre deliberately recalls simple retro chip oscillators, rather than claiming emulation of a particular game, soundtrack or hardware.',
        'The closing G resolves to C at the exact 38.4-second loop; periodic tails and filters avoid filter startup transients.',
    ]
    return p, .10, -23.0, 6800


def stats(x):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim == 1:
        x = x[:, None]
    delta = np.diff(x, axis=0)
    seam = x[0] - x[-1]
    nearby = np.concatenate([delta[:2048], delta[-2048:]], axis=0)
    seam_max = float(np.max(np.abs(seam)))
    nearby_rms = float(np.sqrt(np.mean(nearby ** 2)))
    block = round(.1 * SR)
    first = db(np.sqrt(np.mean(x[:block] ** 2)))
    last = db(np.sqrt(np.mean(x[-block:] ** 2)))
    return dict(sample_frames=len(x), duration_seconds=round(len(x) / SR, 9), sample_rate_hz=SR,
                channels=x.shape[1], peak_linear=round(float(np.max(np.abs(x))), 9),
                peak_dbfs=db(np.max(np.abs(x))), rms_linear=round(float(np.sqrt(np.mean(x ** 2))), 9),
                rms_dbfs=db(np.sqrt(np.mean(x ** 2))), clipped_sample_count=int(np.sum(np.abs(x) >= 1)),
                dc_offset_per_channel=[float(v) for v in np.mean(x, axis=0)],
                seam=dict(boundary_step_per_channel=[float(v) for v in seam], maximum_boundary_step=seam_max,
                          boundary_step_dbfs=db(seam_max), nearby_step_rms=nearby_rms,
                          boundary_step_over_nearby_step_rms=round(seam_max / max(nearby_rms, 1e-12), 5),
                          first_100ms_rms_dbfs=first, last_100ms_rms_dbfs=last,
                          level_change_last_to_first_100ms_db=round(first - last, 5),
                          note='The seam spans one normal sample interval. A small measured step is not a perceptual listening test.'))


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def loudness(path, out):
    result = run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path), '-filter_complex', 'ebur128=peak=true', '-f', 'null', '-'])
    (out / (path.name + '.loudness.txt')).write_text(result.stderr)
    summary = result.stderr.rsplit('Summary:', 1)[-1]
    def value(pattern):
        m = re.search(pattern, summary)
        if not m:
            raise RuntimeError('Missing loudness result: ' + summary)
        return float(m.group(1))
    return dict(integrated_lufs=value(r'I:\s+(-?[\d.]+)\s+LUFS'),
                loudness_range_lu=value(r'LRA:\s+(-?[\d.]+)\s+LU'),
                true_peak_dbtp=value(r'Peak:\s+(-?[\d.]+)\s+dBFS'),
                method='FFmpeg EBU R128 / BS.1770 with reconstructed true peak',
                log_file=path.name + '.loudness.txt')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--out', default=str(Path(__file__).parent / 'rendered'))
    args = parser.parse_args()
    out = Path(args.out)
    out.mkdir(parents=True, exist_ok=True)
    collection = []
    for factory in [folk_waltz, chiptune]:
        p, wet, target, cutoff = factory()
        pcm, gain = p.render(wet, target, cutoff)
        wav = out / (p.slug + '.wav')
        wavfile.write(wav, SR, pcm)
        score = dict(title=p.title, id=p.slug, tempo_bpm=p.bpm, time_signature=f'{p.beats_per_bar}/4',
                     bars=p.bars, key=p.key, chords_by_bar=p.chords, events=p.events, synthesis_seed=p.seed,
                     score_notes=p.notes)
        (out / (p.slug + '.score.json')).write_text(json.dumps(score, ensure_ascii=False, indent=2) + '\n')
        info = dict(id=p.slug, title=p.title, composer='AI-authored for Dormi; procedural synthesis',
                    synthetic=True, original_score=True, external_samples_used=False, genre=p.genre, mood=p.mood,
                    bpm=p.bpm, time_signature=f'{p.beats_per_bar}/4', bars=p.bars, key=p.key,
                    loop_start_sample=0, loop_end_sample=p.n, loop_start_seconds=0, loop_end_seconds=p.n / SR,
                    score_duration_seconds=p.bars * p.beats_per_bar * 60 / p.bpm,
                    reference_pcm=stats(pcm.astype(np.float64) / 32768), mastering_gain=gain,
                    target_rms_dbfs=target, composition_notes=p.notes, recommended_bgm_gain=.30,
                    recommended_listening_gain=.70, review=LIMITATION, files={})
        for ext, codec in [('ogg', ['-c:a', 'libvorbis', '-q:a', '5']),
                           ('mp3', ['-c:a', 'libmp3lame', '-b:a', '160k', '-write_xing', '1'])]:
            dst = out / (p.slug + '.' + ext)
            run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(wav), *codec,
                 '-metadata', 'title=' + p.title, '-metadata', 'artist=Dormi Original Synthetic Music',
                 '-metadata', 'comment=Newly authored procedural music; no external samples', str(dst)])
            raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(dst), '-f', 'f32le', '-acodec', 'pcm_f32le', '-'],
                                 check=True, capture_output=True).stdout
            decoded = np.frombuffer(raw, dtype='<f4').reshape(-1, 2)
            decoded_stats = stats(decoded)
            decoded_stats['frame_count_matches_reference'] = len(decoded) == p.n
            info['files'][ext] = dict(name=dst.name, bytes=dst.stat().st_size,
                                     sha256=hashlib.sha256(dst.read_bytes()).hexdigest(),
                                     decoded_analysis=decoded_stats, loudness=loudness(dst, out))
        info['files']['wav'] = dict(name=wav.name, bytes=wav.stat().st_size,
                                   sha256=hashlib.sha256(wav.read_bytes()).hexdigest(),
                                   format='PCM signed 16-bit stereo, 44100 Hz', loudness=loudness(wav, out))
        # Automated delivery gates. Perceptual listening remains a separate human check.
        assert 35 <= p.n / SR <= 50
        for data in [info['reference_pcm']] + [info['files'][ext]['decoded_analysis'] for ext in ('mp3', 'ogg')]:
            assert data['clipped_sample_count'] == 0
            assert data['peak_dbfs'] < -3
            assert data['sample_frames'] == p.n
            assert data['seam']['boundary_step_dbfs'] < -38
            assert data['seam']['boundary_step_over_nearby_step_rms'] < 5
        collection.append(info)
        print(json.dumps(dict(id=p.slug, duration=p.n / SR, pcm=info['reference_pcm'],
                              loudness=info['files']['wav']['loudness'])), flush=True)
    manifest = dict(collection='Dormi Original Listening Music — Additional Genres', version=1,
                    source='compose-extra-music.py', license='../dist/licenses/music-extra.txt', sample_rate_hz=SR,
                    authorship='Newly specified AI-authored scores and entirely local procedural synthesis; no recordings, samples, soundfonts, or borrowed melodies supplied or used.',
                    listening_review_limitation=LIMITATION, pieces=collection)
    (out / 'music-manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
