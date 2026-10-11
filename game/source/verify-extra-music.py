#!/usr/bin/env python3
"""Verify deterministic synthesis and objective audio-delivery gates. No listening claim."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import numpy as np
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'rendered'
spec = importlib.util.spec_from_file_location('compose_extra', ROOT / 'compose-extra-music.py')
music = importlib.util.module_from_spec(spec)
spec.loader.exec_module(music)
manifest = json.loads((OUT / 'music-manifest.json').read_text())
results = []
for factory, info in zip([music.folk_waltz, music.chiptune], manifest['pieces']):
    p, wet, target, cutoff = factory()
    rendered_again, _ = p.render(wet, target, cutoff)
    sr, saved = wavfile.read(OUT / (p.slug + '.wav'))
    assert sr == 44100
    assert np.array_equal(saved, rendered_again), 'Deterministic PCM did not reproduce'
    assert len(saved) == p.n
    score = json.loads((OUT / (p.slug + '.score.json')).read_text())
    assert len(score['chords_by_bar']) == p.bars
    assert all(0 <= e['beat'] < p.bars * p.beats_per_bar for e in score['events'])
    assert all(0 < e['velocity'] <= 1 and e['gate_beats'] > 0 for e in score['events'])
    measurements = []
    for ext in ['mp3', 'ogg']:
        dst = OUT / (p.slug + '.' + ext)
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(dst), '-f', 'f32le', '-acodec', 'pcm_f32le', '-'], check=True, capture_output=True).stdout
        decoded = np.frombuffer(raw, dtype='<f4').reshape(-1, 2)
        s = music.stats(decoded)
        assert len(decoded) == p.n
        assert s['clipped_sample_count'] == 0
        assert s['peak_dbfs'] < -3
        assert s['seam']['boundary_step_dbfs'] < -38
        assert s['seam']['boundary_step_over_nearby_step_rms'] < 5
        assert -25 < info['files'][ext]['loudness']['integrated_lufs'] < -19
        assert info['files'][ext]['loudness']['true_peak_dbtp'] < -3
        assert hashlib.sha256(dst.read_bytes()).hexdigest() == info['files'][ext]['sha256']
        measurements.append(dict(format=ext, duration_seconds=s['duration_seconds'],
                                 sample_peak_dbfs=s['peak_dbfs'], clipped_sample_count=s['clipped_sample_count'],
                                 integrated_lufs=info['files'][ext]['loudness']['integrated_lufs'],
                                 true_peak_dbtp=info['files'][ext]['loudness']['true_peak_dbtp'],
                                 boundary_step_dbfs=s['seam']['boundary_step_dbfs'],
                                 boundary_step_over_nearby_step_rms=s['seam']['boundary_step_over_nearby_step_rms'],
                                 decoded_frame_count_matches_reference=True))
    results.append(dict(id=p.slug, title=p.title, passed=True, deterministic_pcm_verified=True,
                        event_count=len(p.events), instruments=sorted({e['instrument'] for e in p.events}),
                        sample_frames=p.n, measurements=measurements))
assert results[0]['instruments'] != results[1]['instruments']
report = dict(passed=True, scope='Objective delivery and score checks, with fresh deterministic PCM synthesis.',
              perceptual_listening_performed=False, listening_limitation=music.LIMITATION,
              codec_bit_identity_note='PCM and scores reproduce deterministically here. Encoded container bytes can vary across codec/tool versions.',
              ffmpeg_version=subprocess.run(['ffmpeg', '-version'], capture_output=True, text=True, check=True).stdout.splitlines()[0],
              numpy_version=np.__version__, pieces=results)
(ROOT / 'verification-report.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
