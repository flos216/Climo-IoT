
<img width="2531" height="1265" alt="image" src="https://github.com/user-attachments/assets/bb90759c-6087-4f12-b231-e2549d02f2e2" />
<img width="2527" height="1262" alt="image" src="https://github.com/user-attachments/assets/5c35c57b-690d-45b1-aeed-bdf2a00917fe" />


## 프로젝트 소개

Climo는 Raspberry Pi와 DHT11 센서를 활용하여
실시간 온·습도 데이터를 수집하고,
웹 대시보드 및 모바일 푸시 알림을 통해
환경 상태를 모니터링할 수 있는 IoT 기반 시스템입니다.

임계치를 초과하는 이상 환경이 감지되면
Toast UI 및 Firebase Cloud Messaging(FCM)을 통해
실시간 경고 알림을 제공합니다.

## 주요 기능

- 실시간 온·습도 데이터 시각화
- 상태 카드 기반 환경 상태 표시
- 임계치 설정 기능 - 경고 Toast UI
- Firebase Cloud Messaging 기반 푸시 알림
- ALERT LOG 캘린더
- 다크모드 지원
- 일/주/월 차트 통계

## 프로젝트 구조

```text
climo/
├── src/
├── public/
├── server/
│   ├── temp_humi.py
│   ├── .env
│   └── firebase-service-account.json
├── package.json
└── README.md
```

## 기술 스택

### Frontend
- React
- Vite
- Tailwind CSS
- Chart.js

### Database
- SQLAlchemy
- MariaDB

### Backend (flos216)
- Flask

### Infra / IoT (flos216)
- Raspberry Pi 4
- DHT11 Sensor
- Ngrok

### Notification (flos216)
- Firebase Cloud Messaging (FCM)

## 시스템 구조

```text
DHT11 Sensor
→ Raspberry Pi
→ Flask Server
→ MariaDB
→ React Dashboard
→ FCM Push Notification
```

## 실행 방법

### Frontend

```bash
npm install
npm run build
```

### Backend

```bash
pip install -r requirements.txt
python temp_humi.py
```
--- # 환경 변수 프로젝트 실행 전 .env 파일 생성이 필요합니다.

## Frontend (.env)

```text
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID= VITE_FIREBASE_MEASUREMENT_ID=
VITE_FIREBASE_VAPID_KEY=
```

## Backend (server/.env)

DATABASE_URL=

## 트러블 슈팅

### Firebase Service Worker MIME 오류 문제

FCM 설정 후 브라우저 콘솔에서 아래 오류 발생: The script has an unsupported MIME type ('text/html')

원인 
Flask가 firebase-messaging-sw.js 파일 대신 React의 index.html을 반환하고 있었음. 해결 Flask에서 send_from_directory()를 이용하여 Service Worker 파일을 직접 반환하도록 수정.

```python
@app.route('/firebase-messaging-sw.js')
def firebase_sw():
    return send_from_directory('frontend', 'firebase-messaging-sw.js')
```
    
### Flask DB 연결 오류 문제

```bash
RuntimeError:
Either 'SQLALCHEMY_DATABASE_URI'
or 'SQLALCHEMY_BINDS' must be set.
```

원인
.env 파일 경로가 변경되면서 DATABASE_URL 환경 변수를 읽지 못함. 해결 python-dotenv를 사용하여 .env 로드.

```python
from dotenv import load_dotenv
load_dotenv()
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL")
```

## 팀원 역할
- A(flos216): Flask 서버 / DB 연동 / FCM 푸시 알림
- B: Frontend UI
- C: DB 설계
