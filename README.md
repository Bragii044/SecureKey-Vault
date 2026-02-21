# SecureKey Vault (v1.0.2)

SecureKey Vault는 Electron + React + TypeScript 기반의 로컬 비밀번호 보관 앱입니다.  
모든 데이터는 사용자 기기 내부에만 저장되며, 마스터 비밀번호로 암호화됩니다.

## 핵심 기능

- 로컬 전용 저장소 사용 (클라우드 업로드 없음)
- AES-GCM 기반 데이터 암호화
- PBKDF2 기반 키 파생/비밀번호 검증
- 백업(.json) 내보내기/불러오기
- 1.0.1 백업을 1.0.2 포맷으로 변환 지원

## 보안 구조 요약

- 저장 위치: Electron `app.getPath('userData')` 아래 앱 전용 파일
- 저장 방식: Electron main process 저장소 + 가능 시 `safeStorage` 사용
- 암호화: Web Crypto API (`AES-GCM`)
- 키 파생: `PBKDF2(SHA-256)`
- 레거시 호환: 1.0.1(`SHA256(password+salt)` + CryptoJS AES) 백업 복구/변환 지원

## 요구 사항

- Node.js 20+
- npm
- Windows (설치 파일 빌드 기준)

## 설치 및 실행 (개발)

```bash
npm install
npm run dev
```

Electron 개발 실행:

```bash
npm run dev:electron
```

## 빌드

웹 번들 빌드:

```bash
npm run build
```

Windows 설치 파일 빌드:

```bash
npm run build:electron
```

생성 결과:

- `release/SecureKey Vault Setup 1.0.2.exe`
- `release/win-unpacked/`

## 1.0.1 -> 1.0.2 백업 변환

```bash
npm run migrate:101-to-102 -- --input "C:\path\legacy-101.json" --output "C:\path\migrated-102.json"
```

- 실행 중 마스터 비밀번호를 입력하면 변환됩니다.
- 변환된 JSON은 `version: 2` 형식입니다.

## 1.0.1 백업 파일인지 확인 방법

다음 조건이면 1.0.1 레거시 백업일 가능성이 높습니다.

- `verificationHash`가 64자리 hex 문자열
- 각 item의 `ciphertext`가 `U2FsdGVkX1...` 형태(Base64, `Salted__` 헤더)

## 트러블슈팅

- 아이콘이 바로 안 바뀌어 보이는 경우:
  - 작업표시줄 고정 해제 후 다시 고정
  - 기존 설치 제거 후 재설치
  - Windows 아이콘 캐시 갱신 후 확인
- `bad decrypt` 오류:
  - 잘못된 마스터 비밀번호 가능성이 큼
  - 1.0.1 백업이면 위 변환 명령으로 먼저 변환 후 가져오기 권장

## 기술 스택

- Electron
- React
- TypeScript
- Vite
- Tailwind CSS

## 라이선스

MIT
