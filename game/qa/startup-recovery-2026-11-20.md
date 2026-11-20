# 시작 화면 복구 · 2026.11.20.2

공개판 `2026.11.20.1`에서 사용자가 데스크톱 Edge의 시작 문구에 머무는 현상을 보고했다. 새 세션에서 공개판은 정상 시작했다. 사용자 환경에서 어느 요청이 멈췄는지는 특정하지 못했다. [기존 공개판 Edge 확인](https://github.com/ainssam/dorm-village/actions/runs/44704695281)

12초 동안 시작 화면이 남아 있으면 다시 열기 버튼을 보여 준다. 원래 요청이 완료되면 안내가 함께 사라진다. 저장 잠금이 3초 동안 응답하지 않을 경우 둘러보기로 시작하며, 늦게 허용된 잠금은 즉시 반환한다. [PR #10](https://github.com/ainssam/dorm-village/pull/10)

- 동일 소스의 문법 검사와 회귀 **391/391**, 실패·취소·건너뜀 0. [자동 검사](https://github.com/ainssam/dorm-village/actions/runs/44705186624/job/136182904346)
- Windows Edge에서 정상 시작, 지연된 모델 도착, 멈춘 시작 파일의 수동 재시도, 저장 잠금 지연 후 둘러보기 확인. 첫 실행의 잠금 시나리오가 시간 초과한 뒤 분리 실행과 전체 재실행에서 각각 통과했다. [분리 확인](https://github.com/ainssam/dorm-village/actions/runs/44706024463/job/136185721224) · [Edge 4/4](https://github.com/ainssam/dorm-village/actions/runs/44705816692/job/136185016083)
- 아인2 Vercel `dorm-village`에 `f3f1446fb05ff127b0d4f7affa17e80431ac1f6f`을 고정해 빌드했다. 문법 검사 통과, 배포 `dpl_2zNvA7yXovxtTdH9Q6VQA8Ysm3WQ` READY, 공개 버전 2026.11.20.2. [공개 주소](https://dorm-village.vercel.app/)
- 배포된 주소에서 Windows Edge 157.0.4341.60, 1440px로 새 버전이 마을 광장까지 열리고 시작 화면이 사라지는 것을 확인했다. 브라우저 예외와 요청 오류는 0이었다. [공개 Edge 검수](https://github.com/ainssam/dorm-village/actions/runs/44706582338/job/136187582269)
