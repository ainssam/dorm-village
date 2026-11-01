# 도름마을 파스텔 브랜드 자산 · 2026-11-01

## 결과
실제 Meshy 도름이의 원래 얼굴·형태를 Three.js로 렌더해 확인한 뒤, 그 레퍼런스를 사용해 `image_gen`으로 홍보 일러스트와 얼굴 중심 아이콘을 제작했다. 실제 플레이 화면이 아닌 홍보 일러스트임을 `dist/brand/README.md`와 `source.json`에 명시했다.

카카오톡 홍보 그림은 크림·민트·살구·연분홍·라벤더를 사용하고, 캐릭터의 남색 머리/배 소용돌이를 보존했다. 제목 `도름마을`, 부제 `잠깐 놀고, 만들고, 쉬어 가요.`, 공개 주소 `dorm-village.vercel.app`를 포함한다. 글자와 도름이가 미리보기 가장자리에서 잘리지 않도록 배치했다.

## 검증
- 레퍼런스 두 장과 생성 결과를 직접 열어 외형을 확인했다.
- 변환 후 1200×630 공유 PNG, 192×192 아이콘, 32×32 파비콘을 `view_image`로 직접 열었다. 제목/부제/주소가 읽히고, 작은 아이콘에서 소용돌이와 얼굴이 식별된다.
- ImageMagick `identify`로 공유 이미지와 모든 아이콘 규격을 확인했다.
- 파비콘은 자체 포함 SVG, PNG, 16/32/48/64px ICO로 제공한다. iPhone/iPad용 180px 아이콘도 제공한다.
- 원본 PNG를 그대로 보존하고 형식/규격 변환은 별도 스크립트로 재생성할 수 있다. 파일별 SHA-256을 기록한다.
- 카카오톡의 실제 공유 앱 미리보기나 실물 기기 홈 화면은 이 환경에서 확인하지 않았다. Open Graph/manifest 연결과 공개 URL 확인은 통합 배포 검증에서 수행한다.

## 통합 담당자용
- `og:image`: `https://dorm-village.vercel.app/brand/dorm-village-kakao-1200x630.png`
- `og:image:width`: `1200`, `og:image:height`: `630`, `og:image:type`: `image/png`
- `og:image:alt`: `파스텔 마을에서 손을 흔드는 도름이와 도름마을 제목 — 홍보 일러스트`
- `twitter:card`: `summary_large_image`, `twitter:image`: 같은 PNG 주소
- `<link rel="icon" href="favicon.ico" sizes="any">`, `<link rel="icon" type="image/svg+xml" href="icon.svg">`, `<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">`
- manifest icons는 `brand/icon-192.png`·`brand/icon-512.png`, `type:image/png`, `purpose:any`를 사용한다. 마스크용 여백으로 설계한 자산이 아니므로 `maskable`로 선언하지 않는다.
- 첫 방문 안내에 작은 얼굴 이미지가 필요하면 `brand/icon-192.png`, 대표 그림에는 56KB 안팎의 `brand/dorm-village-share.webp`를 사용할 수 있다.
