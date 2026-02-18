# SecureKey Vault 🛡️

**SecureKey Vault**는 Electron, React, TypeScript로 구축된 현대적이고 안전한 데스크톱 암호 관리자 애플리케이션입니다.
모든 데이터는 기기에 로컬로 저장되며, AES-256 암호화와 PBKDF2 키 파생 함수를 사용하여 최고 수준의 보안을 제공합니다.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Electron](https://img.shields.io/badge/Electron-34.0.0-yf.svg)
![React](https://img.shields.io/badge/React-19.0.0-61dafb.svg)

## ✨ 주요 기능

*   **🔒 강력한 보안**: 모든 비밀번호와 데이터는 AES-256 알고리즘으로 암호화되어 로컬에 저장됩니다.
*   **🔑 마스터 암호 보호**: PBKDF2 알고리즘을 사용하여 마스터 암호를 안전하게 해싱하고 검증합니다.
*   **🔌 오프라인 중심**: 인터넷 연결 없이도 완벽하게 작동하여 외부 해킹 위험을 최소화합니다.
*   **📊 대시보드**: 저장된 비밀번호의 강도와 보안 상태를 한눈에 볼 수 있는 시각화된 대시보드를 제공합니다.
*   **🖥️ 크로스 플랫폼**: Windows 환경에 최적화된 설치 파일(.exe)을 제공합니다.
*   **🎨 모던 UI**: Tailwind CSS를 사용한 깔끔하고 직관적인 사용자 인터페이스.
*   **📂 데이터 관리**: 안전한 데이터 가져오기(Import) 및 내보내기(Export) 기능을 지원합니다.

## 🚀 설치 및 실행 방법

### 1. 설치 파일 다운로드 (사용자용)

최신 버전의 설치 파일은 [Releases](../../releases) 페이지에서 다운로드할 수 있습니다.
*   **SecureKey Vault Setup 1.0.0.exe** 파일을 다운로드하여 실행하면 자동으로 설치됩니다.

### 2. 개발 환경 설정 (개발자용)

소스 코드를 직접 수정하거나 빌드하려면 다음 단계를 따르세요.

#### 필수 요구 사항
*   Node.js (v20 이상 권장)
*   npm

#### 프로젝트 클론 및 의존성 설치
```bash
git clone https://github.com/YOUR_USERNAME/SecureKey-Vault.git
cd SecureKey-Vault
npm install
```

#### 개발 모드 실행
*   **웹 브라우저 모드**:
    ```bash
    npm run dev
    ```
*   **Electron 데스크톱 앱 모드**:
    ```bash
    npm run dev:electron
    ```

## 📦 빌드 및 배포

Windows용 설치 파일(Installer)과 실행 파일(.exe)을 생성하려면 다음 명령어를 실행하세요.

```bash
npm run build:electron
```

빌드가 완료되면 **`release`** 폴더에 설치 파일이 생성됩니다.
*   `release/SecureKey Vault Setup 1.0.0.exe`: 배포용 설치 파일
*   `release/win-unpacked/`: 설치 없이 실행 가능한 포터블 폴더

## 🛠️ 기술 스택

*   **Runtime**: [Electron](https://www.electronjs.org/)
*   **Backend/Frontend**: [React](https://reactjs.org/), [TypeScript](https://www.typescriptlang.org/)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/)
*   **Encryption**: [Crypto-js](https://github.com/brix/crypto-js)
*   **Charting**: [Recharts](https://recharts.org/)

## 📝 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.
