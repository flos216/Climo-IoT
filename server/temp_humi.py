from dotenv import load_dotenv
from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text
from datetime import datetime
from firebase_admin import credentials, messaging
import firebase_admin
import adafruit_dht
import board
import time
import threading
import json
import os

load_dotenv()

app = Flask(
    __name__,
    static_folder='frontend/assets',
    template_folder='frontend'
)
CORS(app, resources={r"/*": {"origins": "*"}})

# Firebase 초기화
FIREBASE_KEY_FILE = "firebase-service-account.json"
if not firebase_admin._apps:
    cred = credentials.Certificate(FIREBASE_KEY_FILE)
    firebase_admin.initialize_app(cred)
    
# Firebase 토큰 저장 파일 경로
FCM_TOKEN_FILE = os.path.join(os.path.dirname(__file__), "fcm_tokens.json")

# ==================== [추가] 가변 임계치 파일 I/O 함수 ====================
CONFIG_FILE = os.path.join(os.path.dirname(__file__), 'config.json')

def load_config():
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"설정 파일 읽기 실패, 디폴트값 사용: {e}")
    
    # 파일이 없거나 깨졌을 때의 시스템 백업용 기본값
    return {
        "temp_warn": 27,
        "temp_alert": 30,
        "humi_warn": 60,
        "humi_alert": 70
    }

# ==================== DHT11 설정 ====================
dht = adafruit_dht.DHT11(board.D2)

# ==================== DB 설정 ====================
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv("DATABASE_URL")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'supersecretkey2026'
app.json.ensure_ascii = False

db = SQLAlchemy(app)

# ==================== JSON 출력 함수 ====================
def pretty_json(data):
    return app.response_class(
        response=json.dumps(data, indent=4, ensure_ascii=False),
        mimetype='application/json'
    )
    
# ==================== 토큰 읽기/저장 함수 ====================    
def load_fcm_tokens():
    if os.path.exists(FCM_TOKEN_FILE):
        with open(FCM_TOKEN_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

def save_fcm_tokens(tokens):
    with open(FCM_TOKEN_FILE, "w", encoding="utf-8") as f:
        json.dump(tokens, f, indent=4, ensure_ascii=False)
        
# ==================== 푸시 발송 함수 ====================          
def send_push_notification(title, body):
    tokens = load_fcm_tokens()

    if not tokens:
        print("저장된 FCM 토큰이 없습니다.")
        return

    for token, info in tokens.items():
        if not info.get("enabled", False):
            continue

        try:
            message = messaging.Message(
                notification=messaging.Notification(
                    title=title,
                    body=body,
                ),
                token=token,
            )

            response = messaging.send(message)
            print("FCM 전송 성공:", response)

        except Exception as e:
            print("FCM 전송 실패:", e)

            if "NotRegistered" in str(e):
                print("만료된 토큰 삭제:", token)
                tokens.pop(token, None)
                save_fcm_tokens(tokens)

            invalid_tokens = []
            for token in invalid_tokens:
                tokens.pop(token, None)

            if invalid_tokens:
                save_fcm_tokens(tokens)
                print("만료 토큰 정리 완료:", len(invalid_tokens))
                
# ==================== 센서 데이터 테이블 ====================
class SensorData(db.Model):
    __tablename__ = 'sensor_data'

    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.now)
    sensor_type = db.Column(db.String(50), nullable=False)
    value = db.Column(db.Float, nullable=False)

# ==================== 경고 이력 테이블 ====================
class AlertLog(db.Model):
    __tablename__ = 'alert_logs'

    alert_id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    alert_level = db.Column(db.String(20), nullable=False)
    alert_message = db.Column(db.String(255))
    action_guide = db.Column(db.String(255))
    temperature = db.Column(db.Float)
    humidity = db.Column(db.Float)
    detected_at = db.Column(db.DateTime, default=datetime.now)
    
# ==================== 차트 테이블 생성 ====================
def create_stat_tables():
    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS hourly_stats (
            record_date DATE NOT NULL,
            record_hour INT NOT NULL,
            avg_temp FLOAT,
            avg_humidity FLOAT,
            PRIMARY KEY (record_date, record_hour)
        )
    """))

    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS daily_stats (
            record_date DATE NOT NULL PRIMARY KEY,
            avg_temp FLOAT,
            avg_humidity FLOAT
        )
    """))

    db.session.execute(text("""
        CREATE TABLE IF NOT EXISTS monthly_stats (
            record_year INT NOT NULL,
            record_month INT NOT NULL,
            avg_temp FLOAT,
            avg_humidity FLOAT,
            PRIMARY KEY (record_year, record_month)
        )
    """))

    db.session.commit()

# ==================== 차트 갱신 함수 ====================
def update_hourly_stats():
    db.session.execute(text("""
        INSERT INTO hourly_stats (record_date, record_hour, avg_temp, avg_humidity)
        SELECT
            DATE(timestamp),
            HOUR(timestamp),
            ROUND(AVG(CASE WHEN sensor_type = 'temp' THEN value END), 1),
            ROUND(AVG(CASE WHEN sensor_type = 'humidity' THEN value END), 1)
        FROM sensor_data
        GROUP BY DATE(timestamp), HOUR(timestamp)
        ON DUPLICATE KEY UPDATE
            avg_temp = VALUES(avg_temp),
            avg_humidity = VALUES(avg_humidity)
    """))
    db.session.commit()

def update_daily_stats():
    db.session.execute(text("""
        INSERT INTO daily_stats (record_date, avg_temp, avg_humidity)
        SELECT
            DATE(timestamp),
            ROUND(AVG(CASE WHEN sensor_type = 'temp' THEN value END), 1),
            ROUND(AVG(CASE WHEN sensor_type = 'humidity' THEN value END), 1)
        FROM sensor_data
        GROUP BY DATE(timestamp)
        ON DUPLICATE KEY UPDATE
            avg_temp = VALUES(avg_temp),
            avg_humidity = VALUES(avg_humidity)
    """))
    db.session.commit()

def update_monthly_stats():
    db.session.execute(text("""
        INSERT INTO monthly_stats (record_year, record_month, avg_temp, avg_humidity)
        SELECT
            YEAR(timestamp),
            MONTH(timestamp),
            ROUND(AVG(CASE WHEN sensor_type = 'temp' THEN value END), 1),
            ROUND(AVG(CASE WHEN sensor_type = 'humidity' THEN value END), 1)
        FROM sensor_data
        GROUP BY YEAR(timestamp), MONTH(timestamp)
        ON DUPLICATE KEY UPDATE
            avg_temp = VALUES(avg_temp),
            avg_humidity = VALUES(avg_humidity)
    """))
    db.session.commit()


def update_all_stats():
    update_hourly_stats()
    update_daily_stats()
    update_monthly_stats()

# ==================== 센서 데이터 저장 ====================
def save_sensor_data(sensor_type, value):
    try:
        data = SensorData(sensor_type=sensor_type, value=value)
        db.session.add(data)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print("센서 데이터 저장 오류:", e)

# ==================== 경고 데이터 저장 ====================
def save_alert(alert_level, alert_message, action_guide, temp, humi):
    try:
        alert = AlertLog(
            alert_level=alert_level,
            alert_message=alert_message,
            action_guide=action_guide,
            temperature=temp,
            humidity=humi
        )
        db.session.add(alert)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print("경고 데이터 저장 오류:", e)

# ==================== SQL: 최근 10분 평균 습도 ====================
def get_recent_avg_humidity(minutes=10):
    try:
        sql = text("""
            SELECT ROUND(AVG(value), 1) AS avg_10min_humi
            FROM sensor_data
            WHERE sensor_type = 'humidity'
            AND timestamp >= NOW() - INTERVAL :minutes MINUTE
        """)

        result = db.session.execute(sql, {"minutes": minutes}).fetchone()

        if result is None or result.avg_10min_humi is None:
            return None

        return float(result.avg_10min_humi)

    except Exception as e:
        print("최근 평균 습도 SQL 조회 오류:", e)
        return None

# ==================== SQL: 최근 5분 온습도 변화량 ====================
def get_recent_temp_humi_diff(minutes=5):
    try:
        sql = text("""
            SELECT
                MAX(CASE WHEN sensor_type = 'humidity' THEN value END)
                - MIN(CASE WHEN sensor_type = 'humidity' THEN value END) AS humi_diff,

                MAX(CASE WHEN sensor_type = 'temp' THEN value END)
                - MIN(CASE WHEN sensor_type = 'temp' THEN value END) AS temp_diff
            FROM sensor_data
            WHERE timestamp >= NOW() - INTERVAL :minutes MINUTE
        """)

        result = db.session.execute(sql, {"minutes": minutes}).fetchone()

        if result is None:
            return 0, 0

        humi_diff = result.humi_diff if result.humi_diff is not None else 0
        temp_diff = result.temp_diff if result.temp_diff is not None else 0

        return round(float(temp_diff), 1), round(float(humi_diff), 1)

    except Exception as e:
        print("급변 감지 SQL 조회 오류:", e)
        return 0, 0

# ==================== [수정] 상태 판단 로직 ====================
def evaluate_status(temp, humi):
    status = "정상"
    alert_level = "정상"
    alert_message = "현재 환경이 정상 범위입니다."
    action_guide = "현재 상태를 유지하세요."

    # [수정] 매 연산 주기마다 고정 수치가 아닌 파일 시스템의 동적 변수를 로드
    config = load_config()
    temp_warn_val = config.get('temp_warn', 27)
    temp_alert_val = config.get('temp_alert', 30)
    humi_warn_val = config.get('humi_warn', 60)
    humi_alert_val = config.get('humi_alert', 70)

    # 1. 현재값 기준 판단 (고정 숫자를 동적 변수로 매핑 교체)
    if humi >= humi_alert_val:
        status = "경고"
        alert_level = "위험"
        alert_message = f"습도가 {humi_alert_val}% 이상입니다."
        action_guide = "환기를 하거나 제습기 사용을 권장합니다."
    elif humi >= humi_warn_val:
        status = "주의"
        alert_level = "주의"
        alert_message = f"습도가 다소 높습니다. ({humi_warn_val}% 이상)"
        action_guide = "습도 변화를 계속 확인하세요."

    if temp >= temp_alert_val:
        status = "경고"
        alert_level = "위험"
        alert_message = f"온도가 {temp_alert_val}도 이상입니다."
        action_guide = "환기 또는 냉방이 필요합니다."
    elif temp >= temp_warn_val and status == "정상":
        status = "주의"
        alert_level = "주의"
        alert_message = f"온도가 다소 높습니다. ({temp_warn_val}도 이상)"
        action_guide = "온도 변화를 계속 확인하세요."

    # 2. SQL 계산 결과 기반 판단
    avg_10min_humi = get_recent_avg_humidity(10)
    if avg_10min_humi is not None and avg_10min_humi > humi_alert_val:
        status = "경고"
        alert_level = "위험"
        alert_message = f"최근 10분 평균 습도가 {avg_10min_humi}%로 높습니다."
        action_guide = "지속적인 고습 상태이므로 제습 또는 환기가 필요합니다."

    # 3. SQL 계산 결과 기반 급변 판단 (기존 코드 그대로 유지)
    temp_diff, humi_diff = get_recent_temp_humi_diff(5)
    if temp_diff >= 15 or humi_diff >= 15:
        status = "경고"
        alert_level = "위험"
        alert_message = "최근 5분 내 온도 또는 습도가 급격히 변화했습니다."
        action_guide = "센서 상태 및 주변 환경 변화를 확인하세요."

    return {
        "status": status,
        "alert_level": alert_level,
        "alert_message": alert_message,
        "action_guide": action_guide,
        "avg_10min_humidity": avg_10min_humi,
        "temp_diff_5min": temp_diff,
        "humidity_diff_5min": humi_diff
    }

# ==================== 센서 1회 읽기 ====================
def read_sensor():
    try:
        time.sleep(2.2)
        temp = dht.temperature
        humi = dht.humidity

        if temp is None or humi is None:
            return None, None

        return float(temp), float(humi)

    except Exception as e:
        print("센서 읽기 오류:", e)
        return None, None

# ==================== 최신 temp/humidity 조회 ====================
def get_latest_values():
    latest_temp = SensorData.query.filter_by(sensor_type='temp') \
        .order_by(SensorData.timestamp.desc()).first()

    latest_humi = SensorData.query.filter_by(sensor_type='humidity') \
        .order_by(SensorData.timestamp.desc()).first()

    if not latest_temp or not latest_humi:
        return None

    latest_time = max(latest_temp.timestamp, latest_humi.timestamp)
    result = evaluate_status(latest_temp.value, latest_humi.value)

    return {
        "temperature": round(latest_temp.value, 1),
        "humidity": round(latest_humi.value, 1),
        "timestamp": latest_time.strftime('%Y-%m-%d %H:%M:%S'),
        "status": result["status"],
        "alert_level": result["alert_level"],
        "alert_message": result["alert_message"],
        "action_guide": result["action_guide"],
        "avg_10min_humidity": result["avg_10min_humidity"],
        "temp_diff_5min": result["temp_diff_5min"],
        "humidity_diff_5min": result["humidity_diff_5min"]
    }

# ==================== 자동 수집 루프 ====================
def sensor_collect_loop():
    with app.app_context():
        while True:
            try:
                temp, humi = read_sensor()

                if temp is not None and humi is not None:
                    print(f"[자동수집] 온도: {temp} / 습도: {humi}")

                    save_sensor_data('temp', temp)
                    save_sensor_data('humidity', humi)

                    result = evaluate_status(temp, humi)

                    # 정상은 저장하지 않고, 주의/위험만 경고 로그 저장
                    if result["alert_level"] in ["주의", "위험"]:
                        save_alert(
                            result["alert_level"],
                            result["alert_message"],
                            result["action_guide"],
                            temp,
                            humi
                            )

                        send_push_notification(
                            "Climo 환경 경고",
                            f'{result["alert_message"]} {result["action_guide"]}'
                        )
                else:
                    print("[자동수집] 센서값 읽기 실패")

            except Exception as e:
                print("[자동수집] 오류:", e)

            time.sleep(10)

# ==================== [추가] 가변 임계치 제어 API 엔드포인트 ====================
@app.route('/api/config', methods=['GET', 'POST'])
def handle_config():
    if request.method == 'GET':
        return pretty_json(load_config())

    if request.method == 'POST':
        try:
            new_config = request.get_json()

            if new_config is None:
                return pretty_json({"error": "JSON 데이터가 없습니다."}), 400

            with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
                json.dump(new_config, f, indent=4, ensure_ascii=False)

            return pretty_json({
                "message": "임계치 설정이 성공적으로 저장되었습니다.",
                "config": new_config
            }), 200

        except Exception as e:
            print("설정 저장 오류:", e)
            return pretty_json({"error": f"파일 저장 실패: {str(e)}"}), 500
        
# ==================== 홈 ====================
@app.route('/')
def serve_react():
    return send_from_directory(app.template_folder, 'index.html')
    """
    <h1>센서 모니터링 서버</h1>
    <p><a href="/data">/data</a> : 최신 센서 데이터 및 상태 판단 결과</p>
    <p><a href="/analysis">/analysis</a> : SQL 기반 평균 및 변화량 분석 결과</p>
    <p><a href="/alerts">/alerts</a> : 최근 경고 이력 조회</p>
    """

# ==================== 최신 데이터 + 상태 판단 ====================
@app.route('/data')
def get_data():
    try:
        latest_data = get_latest_values()

        if latest_data is None:
            return pretty_json({
                "message": "저장된 센서 데이터가 없습니다."
            })

        return pretty_json(latest_data)

    except Exception as e:
        print("데이터 조회 오류:", e)
        return pretty_json({
            "error": "데이터 조회 실패"
        })

# ==================== 경고 이력 조회 ====================
@app.route('/alerts')
def get_alerts():
    try:
        alerts = AlertLog.query.order_by(AlertLog.detected_at.desc()).all()

        result = []
        for a in alerts:
            result.append({
                "alert_id": a.alert_id,
                "alert_level": a.alert_level,
                "alert_message": a.alert_message,
                "action_guide": a.action_guide,
                "temperature": a.temperature,
                "humidity": a.humidity,
                "detected_at": a.detected_at.strftime('%Y-%m-%d %H:%M:%S')
            })

        return pretty_json(result)

    except Exception as e:
        print("경고 조회 오류:", e)
        return pretty_json({
            "error": "경고 조회 실패"
        })
   
# ==================== 차트 날짜별 집계 ====================        
@app.route('/chart/day')
def chart_day():
    try:
        rows = db.session.execute(text("""
            SELECT
                HOUR(timestamp) AS record_hour,
                ROUND(AVG(CASE WHEN sensor_type = 'temp' THEN value END), 1) AS avg_temp,
                ROUND(AVG(CASE WHEN sensor_type = 'humidity' THEN value END), 1) AS avg_humidity
            FROM sensor_data
            WHERE DATE(timestamp) = CURDATE()
            GROUP BY HOUR(timestamp)
            ORDER BY record_hour
        """)).fetchall()

        return pretty_json({
            "labels": [f"{int(r.record_hour)}:00" for r in rows],
            "temp": [r.avg_temp for r in rows],
            "humi": [r.avg_humidity for r in rows]
        })

    except Exception as e:
        print("시간대별 차트 오류:", e)
        return pretty_json({"error": "시간대별 차트 조회 실패"})


@app.route('/chart/week')
def chart_week():
    try:
        rows = db.session.execute(text("""
            SELECT
                YEAR(timestamp) AS record_year,
                WEEK(timestamp, 1) AS record_week,
                ROUND(AVG(CASE WHEN sensor_type = 'temp' THEN value END), 1) AS avg_temp,
                ROUND(AVG(CASE WHEN sensor_type = 'humidity' THEN value END), 1) AS avg_humidity
            FROM sensor_data
            GROUP BY YEAR(timestamp), WEEK(timestamp, 1)
            ORDER BY record_year, record_week
            LIMIT 12
        """)).fetchall()

        return pretty_json({
            "labels": [f"{int(r.record_year)}년 {int(r.record_week)}주차" for r in rows],
            "temp": [r.avg_temp for r in rows],
            "humi": [r.avg_humidity for r in rows]
        })

    except Exception as e:
        print("주차별 차트 오류:", e)
        return pretty_json({"error": "주차별 차트 조회 실패"})


@app.route('/chart/month')
def chart_month():
    try:
        update_monthly_stats()

        rows = db.session.execute(text("""
            SELECT record_year, record_month, avg_temp, avg_humidity
            FROM monthly_stats
            ORDER BY record_year, record_month
            LIMIT 12
        """)).fetchall()

        return pretty_json({
            "labels": [f"{r.record_year}-{str(r.record_month).zfill(2)}" for r in rows],
            "temp": [r.avg_temp for r in rows],
            "humi": [r.avg_humidity for r in rows]
        })

    except Exception as e:
        print("월별 차트 오류:", e)
        return pretty_json({"error": "월별 차트 조회 실패"})

@app.route('/dashboard')
def dashboard():
    return send_from_directory(app.template_folder, 'index.html')

@app.route('/firebase-messaging-sw.js')
def firebase_messaging_sw():
    return send_from_directory(
        app.template_folder,
        'firebase-messaging-sw.js',
        mimetype='application/javascript'
    )

@app.route("/api/fcm-token", methods=["POST"])
def save_fcm_token():
    try:
        data = request.get_json()
        token = data.get("token")

        if not token:
            return pretty_json({"error": "토큰이 없습니다."}), 400

        tokens = load_fcm_tokens()
        tokens[token] = {
            "enabled": True,
            "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        save_fcm_tokens(tokens)

        return pretty_json({"message": "FCM 토큰 활성화 완료"})

    except Exception as e:
        print("FCM 토큰 저장 오류:", e)
        return pretty_json({"error": "FCM 토큰 저장 실패"}), 500


@app.route("/api/fcm-token", methods=["DELETE"])
def delete_fcm_token():
    try:
        data = request.get_json()
        token = data.get("token")

        if not token:
            return pretty_json({"error": "토큰이 없습니다."}), 400

        tokens = load_fcm_tokens()

        if token in tokens:
            tokens[token]["enabled"] = False
            tokens[token]["updated_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            save_fcm_tokens(tokens)

        return pretty_json({"message": "FCM 토큰 비활성화 완료"})

    except Exception as e:
        print("FCM 토큰 비활성화 오류:", e)
        return pretty_json({"error": "FCM 토큰 비활성화 실패"}), 500

@app.route('/<path:path>')
def serve_react_routes(path):
    if path.startswith("assets/"):
        return send_from_directory("frontend", path)

    return send_from_directory(app.template_folder, 'index.html')

# ==================== 실행 ====================
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        create_stat_tables()

    sensor_thread = threading.Thread(target=sensor_collect_loop, daemon=True)
    sensor_thread.start()

    print("서버 시작")
    print(" - 홈: http://0.0.0.0:5000/")
    print(" - 데이터: http://0.0.0.0:5000/data")
    print(" - 분석: http://0.0.0.0:5000/analysis")
    print(" - 경고: http://0.0.0.0:5000/alerts")
    print(" - 센서 데이터는 60초마다 자동 저장됩니다.")

    app.run(host='0.0.0.0', port=5000, debug=False)