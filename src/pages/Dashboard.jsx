import { useEffect, useState, useRef } from "react";
import { useToast } from "../components/ToastProvider";
import Card from "../components/Card";
import Chart from "../components/Chart";
import Header from "../components/Header";
import Footer from "../components/Footer";

function Dashboard() {
  //모바일 가로 모드 안내 창 노출 여부를 제어하는 로컬 상태
  const [showNotice, setShowNotice] = useState(false);

  // 🌟 [수정] 통신 장애 상태를 원인별로 명확히 분리
  const [isOffline, setIsOffline] = useState(!navigator.onLine); // 1순위: 인터넷 자체 단절 여부
  const [isServerDown, setIsServerDown] = useState(false); // 2순위: 백엔드 서버 다운 여부

  const [sensorData, setSensorData] = useState({
    temperature: "-",
    humidity: "-",
    avg_10min_humidity: "-",
    temp_diff_5min: "-",
    humidity_diff_5min: "-",
    status: "-",
    tempTrend: null,
    humiTrend: null,
  });

  const [config, setConfig] = useState({
    temp_warn: "-",
    temp_alert: "-",
    humi_warn: "-",
    humi_alert: "-",
  });

  const showToast = useToast();
  const prevStatusRef = useRef("정상");
  const prevDataRef = useRef({
    temperature: null,
    humidity: null,
  });

  const showStatusAlert = () => {
    showToast(
      `현재 환경 상태: ${sensorData.status}
      ${sensorData.alert_message || "현재 상태가 정상입니다."}
      ${sensorData.action_guide || "현재 상태를 유지하세요."}`,
    );
  };

  const fetchSensorData = async () => {
    // 💡 [1순위 체크] 인터넷 연결이 끊겨있다면 서버 요청을 아예 보내지 않고 차단
    if (!navigator.onLine) {
      setIsOffline(true);
      return;
    }

    try {
      const response = await fetch("/data");

      if (!response.ok) {
        throw new Error(`서버 오류: ${response.status}`);
      }

      const data = await response.json();
      console.log("실제 센서 데이터:", data);

      const newStatus = (data.status ?? "").trim();
      const newAlertLevel = (data.alert_level ?? "").trim();

      const prevTemp = prevDataRef.current.temperature;
      const prevHumi = prevDataRef.current.humidity;

      const currentTemp = Number(data.temperature);
      const currentHumi = Number(data.humidity);

      const tempTrend =
        prevTemp === null || Number.isNaN(currentTemp)
          ? null
          : currentTemp > prevTemp
            ? "up"
            : currentTemp < prevTemp
              ? "down"
              : null;

      const humiTrend =
        prevHumi === null || Number.isNaN(currentHumi)
          ? null
          : currentHumi > prevHumi
            ? "up"
            : currentHumi < prevHumi
              ? "down"
              : null;

      prevDataRef.current = {
        temperature: currentTemp,
        humidity: currentHumi,
      };

      setSensorData({
        temperature: data.temperature ?? "-",
        humidity: data.humidity ?? "-",
        avg_10min_humidity: data.avg_10min_humidity ?? "-",
        temp_diff_5min: data.temp_diff_5min ?? "-",
        humidity_diff_5min: data.humidity_diff_5min ?? "-",
        status: newStatus || "-",
        alert_message: data.alert_message ?? "",
        action_guide: data.action_guide ?? "",
        tempTrend,
        humiTrend,
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

      // 모든 통신이 정상이면 서버 에러 상태를 해제
      setIsServerDown(false);
      setIsOffline(false);
    } catch (error) {
      console.error("센서 데이터 불러오기 실패:", error);
      // 인터넷은 유효하나 fetch에 실패한 것이므로 서버 불안정으로 판정
      setIsServerDown(true);
    }
  };

  // 모바일 진입 및 세로 모드 실시간 센싱
  useEffect(() => {
    const orientationQuery = window.matchMedia(
      "(pointer: coarse) and (orientation: portrait)",
    );
    const handleOrientationChange = (e) => {
      setShowNotice(e.matches);
    };
    if (orientationQuery.matches) setShowNotice(true);
    orientationQuery.addEventListener("change", handleOrientationChange);
    return () =>
      orientationQuery.removeEventListener("change", handleOrientationChange);
  }, []);

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
        tempTrend,
        humiTrend,
      });
    } catch (error) {
      console.error("임계치 설정 불러오기 실패:", error);
    }
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
    }, 3000);

    const handleConfigUpdated = () => {
      fetchSensorData();
      fetchConfig();
    };

    const handleOffline = () => {
      setIsOffline(true);
      setIsServerDown(false);
    };

    const handleOnline = () => {
      setIsOffline(false);
      fetchSensorData();
      fetchConfig();
    };

    window.addEventListener("configUpdated", handleConfigUpdated);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("configUpdated", handleConfigUpdated);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  const cards = [
    {
      title: "Now Temp",
      value: sensorData.temperature,
      unit: "°C",
      trend: sensorData.tempTrend,
      trendValue: sensorData.temp_diff_5min,
    },
    {
      title: "Now Humi",
      value: sensorData.humidity,
      unit: "%",
      trend: sensorData.humiTrend,
      trendValue: sensorData.humidity_diff_5min,
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

      {isOffline && (
        <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-md flex items-center justify-center">
          <div className="bg-white rounded-[24px] shadow-2xl w-[320px] px-8 py-8 text-center">
            <div className="text-[36px] mb-3">🌐</div>

            <h2 className="text-[22px] font-bold mb-2 text-gray-800">
              네트워크 불안정
            </h2>

            <p className="text-[13px] leading-5 text-gray-500">
              인터넷 연결이 원활하지 않습니다.
              <br />
              기기의 와이파이 또는 셀룰러 상태를 확인해 주세요.
            </p>
          </div>
        </div>
      )}

      {!isOffline && isServerDown && (
        <div className="fixed inset-0 z-[10000] bg-black/40 backdrop-blur-md flex items-center justify-center">
          <div className="bg-white rounded-[24px] shadow-2xl w-[340px] px-8 py-8 text-center">
            <div className="text-[36px] mb-3">📡</div>

            <h2 className="text-[22px] font-bold mb-2 text-gray-800">
              서버 통신 불안정
            </h2>

            <p className="text-[13px] leading-5 text-gray-500 mb-6">
              서버와 데이터를 주고받을 수 없습니다.
              <br />
              서비스 제공 서버의 점검 상태를 확인해 주세요.
            </p>

            <button
              onClick={fetchSensorData}
              className="
          w-full
          h-[46px]
          bg-[#46A2F8]
          text-white
          font-bold
          rounded-xl
          hover:bg-[#3294f2]
          transition
        "
            >
              서버 재연결 시도
            </button>
          </div>
        </div>
      )}

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
              trendValue={card.trendValue}
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
