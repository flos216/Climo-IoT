import { useEffect, useState, useRef } from "react";
import { useToast } from "../components/ToastProvider";
import Card from "../components/Card";
import Chart from "../components/Chart";
import Header from "../components/Header"; // Header 추가
import Footer from "../components/Footer"; // Footer 추가

function Dashboard() {
  //모바일 가로 모드 안내 창 노출 여부를 제어하는 로컬 상태
  const [showNotice, setShowNotice] = useState(false);

  const [sensorData, setSensorData] = useState({
    temperature: "-",
    humidity: "-",
    avg_10min_humidity: "-",
    temp_diff_5min: "-",
    humidity_diff_5min: "-",
    status: "-",
  });

  const [config, setConfig] = useState({
    temp_warn: "-",
    temp_alert: "-",
    humi_warn: "-",
    humi_alert: "-",
  });

  const showToast = useToast();
  const prevStatusRef = useRef("정상");

  const showStatusAlert = () => {
    showToast(
      `현재 환경 상태: ${sensorData.status}
      ${sensorData.alert_message || "현재 상태가 정상입니다."}
      ${sensorData.action_guide || "현재 상태를 유지하세요."}`,
    );
  };

  const fetchSensorData = async () => {
    try {
      const response = await fetch("/data");

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      const data = await response.json();
      console.log("실제 센서 데이터:", data);

      const newStatus = (data.status ?? "").trim();
      const newAlertLevel = (data.alert_level ?? "").trim();

      setSensorData({
        temperature: data.temperature ?? "-",
        humidity: data.humidity ?? "-",
        avg_10min_humidity: data.avg_10min_humidity ?? "-",
        temp_diff_5min: data.temp_diff_5min ?? "-",
        humidity_diff_5min: data.humidity_diff_5min ?? "-",
        status: newStatus || "-",
        alert_message: data.alert_message ?? "",
        action_guide: data.action_guide ?? "",
      });

      if (
        (newStatus === "주의" ||
          newStatus === "경고" ||
          newAlertLevel === "주의" ||
          newAlertLevel === "위험") &&
        prevStatusRef.current !== newStatus
      ) {
        showToast(
          `현재 환경 상태: ${newStatus || newAlertLevel}
          ${data.alert_message || "상태 확인이 필요합니다."}
          ${data.action_guide || ""}`,
        );
      }

      prevStatusRef.current = newStatus;
    } catch (error) {
      console.error("센서 데이터 불러오기 실패:", error);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch("/api/config");
      const data = await response.json();
      console.log("config data:", data);

      setConfig({
        temp_warn: data.temp_warn ?? "-",
        temp_alert: data.temp_alert ?? "-",
        humi_warn: data.humi_warn ?? "-",
        humi_alert: data.humi_alert ?? "-",
      });
    } catch (error) {
      console.error("임계치 설정 불러오기 실패:", error);
    }
  };

  // 5분 전 데이터와 비교하여 trend(상승/하강) 값을 결정하는 함수
  const getTrend = (diff) => {
    const numDiff = parseFloat(diff);
    if (isNaN(numDiff)) return null;
    if (numDiff > 0) return "up";
    if (numDiff < 0) return "down";
    return null;
  };

  // 모바일 진입 및 세로 모드 실시간 센싱을 위한 useEffect
  useEffect(() => {
    // 터치 기기(pointer: coarse)이면서 세로 모드(orientation: portrait)인지 판정하는 표준 미디어 쿼리
    const orientationQuery = window.matchMedia(
      "(pointer: coarse) and (orientation: portrait)",
    );

    // 방향 변경 이벤트가 발생했을 때 상태를 동적으로 업데이트하는 핸들러
    const handleOrientationChange = (e) => {
      if (e.matches) {
        setShowNotice(true);
      } else {
        setShowNotice(false); // 가로로 돌리면 자동으로 안내 창을 닫음
      }
    };

    // 마운트 시점 최초 1회 조건 검사
    if (orientationQuery.matches) {
      setShowNotice(true);
    }

    // 미디어 쿼리 리스너 등록
    orientationQuery.addEventListener("change", handleOrientationChange);

    // 메모리 누수 방지를 위한 클린업
    return () =>
      orientationQuery.removeEventListener("change", handleOrientationChange);
  }, []);

  useEffect(() => {
    fetchSensorData();
    fetchConfig();

    const interval = setInterval(() => {
      fetchSensorData();
      fetchConfig();
    }, 10000);

    const handleConfigUpdated = () => {
      fetchSensorData();
      fetchConfig();
    };

    window.addEventListener("configUpdated", handleConfigUpdated);

    return () => {
      clearInterval(interval);
      window.removeEventListener("configUpdated", handleConfigUpdated);
    };
  }, []);

  const cards = [
    {
      title: "Now Temp",
      value: sensorData.temperature,
      unit: "°C",
      trend: getTrend(sensorData.temp_diff_5min), // 실시간 diff 값 연동
    },
    {
      title: "Now Humi",
      value: sensorData.humidity,
      unit: "%",
      trend: getTrend(sensorData.humidity_diff_5min), // 실시간 diff 값 연동
    },
    {
      title: "10min Avg Humi",
      value: sensorData.avg_10min_humidity,
      unit: "%",
    },
    {
      title: "Status",
      value: sensorData.status,
      unit: "",
      onClick: showStatusAlert,
    },
  ];

  return (
    // 1. 전체 페이지 레이아웃: 헤더-본문-푸터 순서로 배치
    <div className="flex flex-col min-h-screen">
      {/* 모바일 세로 모드 진입 시 상단에 노출되는 플로팅 안내 바 */}
      {showNotice && (
        <div className="fixed top-4 left-4 right-4 z-[9999] bg-[color:var(--color-bgs)] px-5 py-4 rounded-2xl shadow-2xl flex justify-between items-center border border-white/20 backdrop-blur-md bg-opacity-95 transition-all duration-300">
          <div className="flex items-center gap-3 text-base md:text-lg font-medium">
            <span>🔄</span>
            <span>
              원활한 차트 조회를 위해{" "}
              <strong>모바일 환경에서는 가로 모드</strong> 조회를 권장합니다.
            </span>
          </div>
          <button
            onClick={() => setShowNotice(false)}
            className="ml-4 font-bold text-xl p-1 w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 active:bg-white/30 transition"
          >
            ✕
          </button>
        </div>
      )}

      {/* 상단 헤더 */}
      <Header />

      {/* 2. 본문 컨테이너: flex-grow를 주어 푸터를 하단으로 밀어냄 */}
      <main className="flex-grow flex flex-col items-center pb-[100px] relative w-full">
        {/* 대시보드 특유의 배경 디자인 (파란 배경 등) */}
        <div
          className="
          absolute 
          top-[9px]
          left-[25px]
          right-[25px]
          bottom-0
          bg-[color:var(--color-bgs)] 
          rounded-t-[40px] 
          -z-10
        "
        ></div>

        {/* 카드 및 차트 그리드 영역 */}
        <div
          className="
          grid 
          gap-6 
          mt-[115px] 
          w-full 
          max-w-[1200px] 
          px-[50px] 
          justify-center
          grid-cols-1 sm:grid-cols-2 lg:grid-cols-4
          z-10
          "
        >
          {cards.map((card, i) => (
            <Card
              key={i}
              title={card.title}
              value={card.value}
              unit={card.unit}
              status={sensorData.status}
              trend={card.trend}
              onClick={card.onClick}
            />
          ))}

          {/* 실시간 차트 영역 */}
          <div
            className="
              relative
              w-full
              bg-[var(--color-bg)]
              rounded-2xl shadow-xl
              p-6
              h-[600px]
              flex items-center justify-center
            "
            style={{ gridColumn: "1 / -1" }}
          >
            <div
              className="
                absolute
                top-2
                left-6
                z-20
                text-[11px]
                text-gray-700
                leading-5
              "
            >
              <div>
                🌡️ 주의 {config.temp_warn}℃ / 경고 {config.temp_alert}℃
              </div>
              <div>
                💧 주의 {config.humi_warn}% / 경고 {config.humi_alert}%
              </div>
            </div>

            <Chart />
          </div>
        </div>
      </main>

      {/* 하단 푸터 */}
      <Footer />
    </div>
  );
}

export default Dashboard;
