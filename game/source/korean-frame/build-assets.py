#!/usr/bin/env python3
"""Render exact modern Hangul title as font outlines, never generated text.

Requires fontTools. Rendering the generated SVGs to PNG is a separate resvg step.
This creates original paper/wood artwork; it does not reproduce museum images.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
import hashlib, json, random, unicodedata

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'assets'
OUT.mkdir(exist_ok=True)
FONT = ROOT / 'fonts/NanumBrushScript-Regular.ttf'
TITLE = '훈민정음'
assert TITLE == '\ud6c8\ubbfc\uc815\uc74c'
assert unicodedata.normalize('NFC', TITLE) == TITLE
font = TTFont(FONT)
cmap = font.getBestCmap()
glyphs = font.getGlyphSet()
coverage = []
for ch in TITLE:
    name = cmap.get(ord(ch))
    assert name and name != '.notdef', f'Missing title glyph {ch}'
    bounds = BoundsPen(glyphs)
    glyphs[name].draw(bounds)
    assert bounds.bounds is not None
    coverage.append({'character':ch, 'codepoint':f'U+{ord(ch):04X}',
                     'glyph':name,'outlineBounds':bounds.bounds})

# Retain the font's natural brush silhouettes and proportions. Extra tracking
# stops the deliberately loose strokes from colliding between syllables.
scale = 0.53
tracking = 105
offset = 0
shapes=[]
for ch in TITLE:
    name = cmap[ord(ch)]
    pen = SVGPathPen(glyphs)
    glyphs[name].draw(pen)
    shapes.append(f'<path data-character="{ch}" data-codepoint="U+{ord(ch):04X}" transform="translate({offset},0)" d="{pen.getCommands()}"/>')
    offset += font['hmtx'][name][0] + tracking
# Combined silhouette is centered by visual bounds, not advance width.
right = (offset - font['hmtx'][cmap[ord(TITLE[-1])]][0] - tracking) + coverage[-1]['outlineBounds'][2]
left = coverage[0]['outlineBounds'][0]
x = (1600 - (right-left)*scale)/2 - left*scale
top = max(v['outlineBounds'][3] for v in coverage)
bottom = min(v['outlineBounds'][1] for v in coverage)
baseline = 393 + (top+bottom)*scale/2
ink = f'<g id="exact-title-ink" aria-label="{TITLE}" fill="#302e29" transform="translate({x:.4f},{baseline:.4f}) scale({scale},-{scale})">'+''.join(shapes)+'</g>'

# Sparse fibres are deliberately much lighter than the four black syllables.
rng=random.Random(1443)
fibres=[]
for _ in range(1000):
    fx=rng.uniform(0,1600);fy=rng.uniform(0,800)
    length=rng.uniform(1.2,9)
    fibres.append(f'<path d="M{fx:.2f},{fy:.2f}l{length:.2f},{rng.uniform(-.8,.8):.2f}"/>')
paper='''<defs>
 <radialGradient id="paper-warmth" cx="48%" cy="35%" r="76%">
  <stop offset="0" stop-color="#fcf4df"/><stop offset="0.72" stop-color="#f6ead1"/><stop offset="1" stop-color="#eddec1"/>
 </radialGradient>
</defs>
<rect width="1600" height="800" fill="url(#paper-warmth)"/>
'''+ '<g fill="none" stroke="#8f8063" stroke-width="0.6" opacity="0.12">'+''.join(fibres)+'</g>'
# A small abstract petal impression, not a signature, a Hanja seal, or an
# invented character. This has no educational text content.
stamp='''<g transform="translate(1418 648) rotate(-5)" fill="none" stroke="#af5444" opacity=".8">
 <rect x="-24" y="-24" width="48" height="48" rx="3" stroke-width="2.4"/>
 <circle r="10" stroke-width="2"/>
 <path d="M-8,-8Q-19,-19 -17,0Q-18,19 -8,8M8,-8Q19,-19 17,0Q18,19 8,8" stroke-width="1.7"/>
</g>'''
metadata=f'''<title>{TITLE} — modern Hangul brush lettering</title>
<desc>Exact modern Hangul title in Nanum Brush Script. Font outlines are fixed paths, with no runtime font dependency. Original paper artwork, not a facsimile. The small red ornament is abstract and contains no text.</desc>
<metadata>Font: Nanum Brush Script, Copyright 2010 NHN Corporation, Sandoll Communications Inc.; SIL OFL 1.1. Source: https://github.com/google/fonts/tree/main/ofl/nanumbrushscript</metadata>'''
def svg(body,w=1600,h=800):
    return f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img" aria-label="{TITLE}">\n{metadata}\n{body}\n</svg>\n'

(OUT/'hunminjeongeum-paper.svg').write_text(svg(paper+ink+stamp),encoding='utf-8')
(OUT/'hunminjeongeum-ink.svg').write_text(svg(ink),encoding='utf-8')

# Optional flat thumbnail. The real 3D model should use paper texture + geometry.
frame='''<defs>
 <linearGradient id="wood" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#b78a5d"/><stop offset=".55" stop-color="#936541"/><stop offset="1" stop-color="#6f492f"/></linearGradient>
</defs>
<rect x="8" y="8" width="1712" height="912" rx="12" fill="#593d2b"/>
<rect x="0" y="0" width="1712" height="912" rx="10" fill="url(#wood)"/>
<path d="M8 8H1704L1656 56H56V856L8 904Z" fill="#d2aa78" opacity=".62"/>
<path d="M1704 8V904H8L56 856H1656V56Z" fill="#5e3d28" opacity=".48"/>
<rect x="49" y="49" width="1614" height="814" fill="#5a3c29"/>
<g transform="translate(56 56)">'''+paper+ink+stamp+'''</g>
<path d="M56 856V56H1656" fill="none" stroke="#614932" stroke-width="7" opacity=".35"/>
<path d="M56 856H1656V56" fill="none" stroke="#f0d6b1" stroke-width="4" opacity=".32"/>'''
(OUT/'hunminjeongeum-framed.svg').write_text(svg(frame,1720,920),encoding='utf-8')

# Production wall-art face: 1.08 x 1.86 world-unit inset, rounded to exact 0.58.
# Four modern syllables read top to bottom; the game supplies the wooden frame.
vertical=[]
vscale=.475
for index, ch in enumerate(TITLE):
    name=cmap[ord(ch)]
    pen=SVGPathPen(glyphs)
    glyphs[name].draw(pen)
    bx0,by0,bx1,by1=coverage[index]['outlineBounds']
    cx=580-(bx0+bx1)*vscale/2
    cy=315+index*450+(by0+by1)*vscale/2
    vertical.append(f'<path data-character="{ch}" data-codepoint="U+{ord(ch):04X}" transform="translate({cx:.4f},{cy:.4f}) scale({vscale},-{vscale})" d="{pen.getCommands()}"/>')
verticalPaper='<g transform="scale(.725 2.5)">'+paper+'</g>'
verticalInk='<g id="exact-title-ink" aria-label="훈민정음" fill="#302e29">'+''.join(vertical)+'</g>'
verticalStamp=stamp.replace('translate(1418 648)','translate(826 1792)')
(OUT/'hunminjeongeum-calligraphy.svg').write_text(svg(verticalPaper+verticalInk+verticalStamp,1160,2000),encoding='utf-8')

record={
 'title':TITLE,'textForm':'modern NFC Hangul, not a Middle Korean transcription',
 'verifiedOn':'2026-10-04','width':1160,'height':2000,'aspectRatio':.58,
 'productionAsset':'assets/hunminjeongeum-calligraphy.png',
 'vectorSource':'assets/hunminjeongeum-calligraphy.svg',
 'layout':'Vertical top-to-bottom 훈 / 민 / 정 / 음; game geometry supplies frame.',
 'targetWorldFace':{'width':1.08,'height':1.86,'x':4.58,'y':1.96,'z':-4.76},
 'runtimeFontDependency':False,'glyphCount':4,'glyphCoverage':coverage,
 'font':{'family':'Nanum Brush Script','version':'1.100','license':'SIL OFL 1.1',
  'copyright':'Copyright 2010 NHN Corporation. Font designed by Sandoll Communications Inc.',
  'sha256':hashlib.sha256(FONT.read_bytes()).hexdigest(),
  'source':'https://raw.githubusercontent.com/google/fonts/main/ofl/nanumbrushscript/NanumBrushScript-Regular.ttf',
  'licenseSource':'https://raw.githubusercontent.com/google/fonts/main/ofl/nanumbrushscript/OFL.txt',
  'metadataSource':'https://raw.githubusercontent.com/google/fonts/main/ofl/nanumbrushscript/METADATA.pb',
  'fontModified':False,
  'hanjaCoverage':{ch:bool(cmap.get(ord(ch))) for ch in '訓民正音'},
  'hanjaPolicy':'Not included in artwork because this brush font has no Hanja coverage; no fallback glyphs.'},
 'sourceImagesUsed':False,
 'historicalClaims':[
  {'claim':'Modern title 훈민정음 and Hanja title 訓民正音; 1443 letters and 1446 book are distinct.', 'source':'https://www.hangeul.go.kr/exhibition/541'},
  {'claim':'Modern basic letters number 24. Composite letters and syllable-position inventories are separate counts.','source':'https://www.korean.go.kr/hangeul/principle/001.html'},
  {'claim':'The original system had 28 letters: 17 consonants and 11 vowels.','source':'https://www.hangeul.go.kr/exhibition/541'},
  {'claim':'October 9 is the commemorative Hangeul Day date; do not assert an exact proven creation or public ceremony on that day.','source':'https://www.korean.go.kr/hangeul/origin/001.html'},
  {'claim':'Official transcription has the title 訓民正音 and 28-letter statement.','source':'https://contents.history.go.kr/front/hm/view.do?levelId=hm_091_0010'}
 ],
 'suggestedModernUICaption':{'text':'누구나 쉽게 배워, 날마다 편하게','label':'세종의 뜻을 오늘말로 풀어쓴 문장','historicalQuotation':False,'rendering':'Separate normal UI font, not baked into calligraphy artwork.'},
 'suggestedTimeline':'1443년 창제 · 1446년 『훈민정음』 간행 · 10월 9일 한글날',
 'rights':{'historicalTitle':'Ancient title only, not a modern translation or historical photograph.',
  'museumPolicySource':'https://www.hangeul.go.kr/html/nurizip/copyrightPolicy.do',
  'museumImages':'None downloaded or reused. Museum policy requires item-level KOGL check for image reuse.',
  'output':'Original code-generated paper, frame and abstract decoration. Fonts are used as lettering outlines in a document asset; no derivative font is generated.'}
}
(ROOT/'asset-manifest.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'title':TITLE,'codepoints':[r['codepoint'] for r in coverage],'glyphCount':len(coverage),'output':str(OUT)},ensure_ascii=False))
