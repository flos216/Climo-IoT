import { useEffect, useState, useRef } from "react";
import { useToast } from "../components/ToastProvider";
import Card from "../components/Card";
import Chart from "../components/Chart";
import Header from "../components/Header"; // Header 추가
import Footer from "../components/Footer"; // Footer 추가

function Dashboard() {
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
    },
    {
      title: "Now Humi",
      value: sensorData.humidity,
      unit: "%",
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
