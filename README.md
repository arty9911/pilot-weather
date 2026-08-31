# AVBRIEF — 조종사용 핵심 기상 브리핑 앱

METAR/TAF, 크로스윈드 계산, 강수/구름 레이더, 기상청 임의지점 실황을 한 화면에서 보는 조종사용 웹앱입니다.
Vercel 서버리스 함수(`api/` 폴더) + 정적 프론트엔드(`public/` 폴더) 구조입니다.

## 구성

- **레이더 탭**: 강수(RainViewer) / 구름(OpenWeatherMap 전운량) 애니메이션 지도. 국내 공항 19곳을 지도에 표시하고 클릭하면 실시간 METAR 요약을 보여줍니다. "내 위치" 버튼으로 현재 위치의 기상정보도 확인 가능.
- **임의지점 · HLZ 실황 탭**: 공항이 아닌 지점(산불 현장, 헬기 이착륙장 등)의 위도/경도를 입력하면 기상청 초단기실황(풍향/풍속, 기온, 습도, 강수형태)을 조회.
- **공항 · METAR/TAF 탭**: ICAO 코드로 조회. 풍향/풍속(돌풍 포함), 시정, 운고/운량, 기온/이슬점, QNH, 특이기상, 비행등급(VFR/MVFR/IFR/LIFR), 활주로 방위 입력 시 정풍·측풍 성분 자동 계산, TAF 예보 기간별 요약.

METAR/TAF는 미국 NOAA의 aviationweather.gov 공개 API(키 불필요)를 `api/metar.js`, `api/taf.js`가 대신 호출합니다(브라우저에서 직접 호출 시 CORS로 차단되기 때문). 기상청/구름 데이터는 각각 서비스키가 필요합니다.

## 스마트폰에서 쓰기 (PWA)

배포된 URL로 폰 브라우저에서 접속한 다음:
- **Android(Chrome)**: 주소창 오른쪽 메뉴 → "앱 설치" 또는 자동으로 뜨는 설치 배너 탭
- **iPhone(Safari)**: 공유 버튼 → "홈 화면에 추가"

## 클라우드 배포 (Vercel)

1. vercel.com 가입 → "Add New... → Project" → GitHub 저장소 연결
2. Framework Preset은 "Other"로 두면 됩니다 (Build Command 비워둠, `vercel.json`이 `public` 폴더를 정적 루트로 지정합니다)
3. 배포 전 "Environment Variables"에서 `KMA_SERVICE_KEY`, `OWM_API_KEY` 추가 (기상청/구름 탭용, 없어도 METAR/TAF/강수레이더는 동작)
4. Deploy 클릭 → `https://[프로젝트명].vercel.app` 형태의 URL 발급
5. 이후 GitHub Desktop에서 Push할 때마다 Vercel이 자동으로 재배포합니다

## 로컬에서 테스트하기

Vercel CLI로 실제 배포와 동일한 환경(서버리스 함수 포함)을 로컬에서 그대로 실행합니다.

```bash
npm install -g vercel
cd pilot-weather
cp .env.example .env
# .env 파일을 열어 KMA_SERVICE_KEY, OWM_API_KEY 값을 입력 (선택 사항)
vercel dev
```

실행 후 터미널에 나오는 주소(보통 `http://localhost:3000`)로 접속합니다. 처음 실행 시 Vercel 계정 로그인과 프로젝트 연결을 묻는 안내가 나오면 화면 안내대로 진행하면 됩니다.

## 기상청 서비스키 발급 방법

1. 공공데이터포털(data.go.kr) 접속 → "기상청_단기예보 ((구)_동네예보) 조회서비스" 검색 후 활용신청
2. 승인 후 "일반 인증키(Decoding)" 값을 `.env`(로컬) 또는 Vercel Environment Variables(배포)의 `KMA_SERVICE_KEY`에 입력

키를 입력하지 않아도 METAR/TAF 탭(공항 브리핑)과 강수 레이더는 정상 동작합니다.

## 구름 레이어용 OpenWeatherMap 키 발급 방법

1. openweathermap.org 접속 → 무료 회원가입
2. 로그인 후 "API keys" 메뉴에서 기본 발급된 키를 복사 (또는 새로 생성)
3. `.env`(로컬) 또는 Vercel Environment Variables(배포)의 `OWM_API_KEY`에 붙여넣기 (발급 후 활성화까지 최대 몇 시간 걸릴 수 있습니다)

**참고**: 이 구름 레이어는 전체 흐림 정도(전운량, %)를 보여주는 위성 기반 이미지로, 고도별(저고도/중고도/고고도) 구분은 없습니다. 실제 저고도 구름(운고)은 공항 탭의 METAR에 표시되는 BKN/OVC 고도(ft)가 훨씬 정확한 항공기상 기준 정보입니다.

## 알아두어야 할 제약

- METAR/TAF는 국내외 모든 ICAO 코드에서 조회 가능하지만, 해당 공항에 관측 장비가 없으면 결과가 없을 수 있습니다.
- 이 앱은 참고용입니다. 실제 비행 결심은 반드시 공식 항공기상청 브리핑으로 재확인하세요.
- 기상청 초단기실황은 매시 40분 발표, 관측 지연이 있을 수 있습니다.
