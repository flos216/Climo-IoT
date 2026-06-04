import React, { useState, useEffect, useMemo } from "react";
import { useToast } from "../components/ToastProvider";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
);

// ==================== API 호출 모듈 ====================
const fetchChartData = async (type) => {
  try {
    let url = "/data";
    if (type === "day") url = "/chart/day";
    if (type === "week") url = "/chart/week";
    if (type === "month") url = "/chart/month";

    const response = await fetch(url);
    if (!response.ok) throw new Error(`서버 오류: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("차트 데이터 불러오기 실패:", error);
    return null;
  }
};

const Chart = () => {
  const showToast = useToast();
  const [viewType, setViewType] = useState("realtime");

  // 런타임 글로벌 테마 감지를 위한 상태 및 참조 포인터 수립
  const [currentTheme, setCurrentTheme] = useState("light");

  // 경고 이력 및 달력 상태
  const [alertLogs, setAlertLogs] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  const [realtimeData, setRealtimeData] = useState({
    labels: [],
    temp: [],
    humi: [],
  });
  const [historyData, setHistoryData] = useState({
    labels: [],
    temp: [],
    humi: [],
  });

  const [calendarDate, setCalendarDate] = useState(new Date());

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const goPrevMonth = () => {
    setSelectedDate(null);
    setCalendarDate(new Date(year, month - 1, 1));
  };

  const goNextMonth = () => {
    setSelectedDate(null);
    setCalendarDate(new Date(year, month + 1, 1));
  };

  // 캘린더 날짜 계산 변수
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // <html> 태그의 다크모드 클래스 변화를 실시간으로 감지하는 옵저버 파이프라인
  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setCurrentTheme(isDark ? "dark" : "light");

    const observer = new MutationObserver(() => {
      const currentIsDark = document.documentElement.classList.contains("dark");
      setCurrentTheme(currentIsDark ? "dark" : "light");
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // 경고 데이터 날짜/시간별 그룹화 고도화
  const alertsByDate = useMemo(() => {
    const grouped = {};
    alertLogs.forEach((log) => {
      const [datePart, timePart] = log.detected_at.split(" ");
      if (!grouped[datePart]) {
        grouped[datePart] = { level: log.alert_level, logs: [] };
      } else {
        if (log.alert_level === "위험") grouped[datePart].level = "위험";
      }
      grouped[datePart].logs.push({ ...log, time: timePart });
    });
    return grouped;
  }, [alertLogs]);

  // 실시간 및 탭 전환 통합 데이터 동기화
  useEffect(() => {
    const updateChart = async () => {
      if (viewType === "alerts") {
        try {
          const res = await fetch("/alerts");
          const data = await res.json();
          setAlertLogs(data);
        } catch (error) {
          console.error("경고 이력 불러오기 실패:", error);
        }
        return;
      }

      if (viewType === "realtime") {
        const data = await fetchChartData("realtime");
        if (data) {
          const now = new Date();
          const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

          setRealtimeData((prev) => ({
            labels: [...prev.labels.slice(-9), timeStr],
            temp: [...prev.temp.slice(-9), data.temperature],
            humi: [...prev.humi.slice(-9), data.humidity],
          }));
        }
      } else {
        const data = await fetchChartData(viewType);
        if (data) {
          setHistoryData({
            labels: data.labels,
            temp: data.temp,
            humi: data.humi,
          });
        }
      }
    };

    updateChart();
    const interval = setInterval(
      updateChart,
      viewType === "realtime" ? 10000 : 300000,
    );
    return () => clearInterval(interval);
  }, [viewType]);

  const displayData = useMemo(() => {
    return viewType === "realtime" ? realtimeData : historyData;
  }, [viewType, realtimeData, historyData]);

  // [동적 연동] 테마 변경 상태(currentTheme)에 반응하여 실시간으로 정밀 색상값 파싱
  const tempColor =
    typeof window !== "undefined"
      ? window
          .getComputedStyle(document.documentElement)
          .getPropertyValue("--color-temp")
          .trim() || "#ff3434"
      : "#ff3434";

  const humiColor =
    typeof window !== "undefined"
      ? window
          .getComputedStyle(document.documentElement)
          .getPropertyValue("--color-humi")
          .trim() || "#3c69fd"
      : "#3c69fd";

  const textColor =
    typeof window !== "undefined"
      ? window
          .getComputedStyle(document.documentElement)
          .getPropertyValue("--color-text-primary")
          .trim() || "#3F3F3F"
      : "#3F3F3F";

  // 차트 픽셀 맵 매핑 데이터 구조체
  const chartConfig = {
    labels: displayData.labels,
    datasets: [
      {
        label: "온도 (°C)",
        data: displayData.temp,
        borderColor: tempColor,
        backgroundColor: tempColor + "1A", // 알파 채널 10% 투명도 수립
        yAxisID: "y_temp",
        tension: 0.4,
        fill: true,
      },
      {
        label: "습도 (%)",
        data: displayData.humi,
        borderColor: humiColor,
        backgroundColor: humiColor + "1A",
        yAxisID: "y_humi",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  // 차트 디스플레이 인터페이스 옵션 세팅
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 300 }, // 스킨 체인지 시 은은하고 심미성 높은 연출을 위한 딜레이 부여
    interaction: {
      mode: "index",
      intersect: false,
    },
    scales: {
      y_temp: {
        position: "left",
        min: 0,
        max: 50,
        title: {
          display: true,
          text: "온도 (°C)",
          color: tempColor,
          font: { size: 13, weight: "bold" },
        },
        ticks: { color: textColor },
        grid: { color: textColor + "20" }, // 12% 투명도를 격자선에 가미
      },
      y_humi: {
        position: "right",
        min: 10,
        max: 90,
        title: {
          display: true,
          text: "습도 (%)",
          color: humiColor,
          font: { size: 13, weight: "bold" },
        },
        ticks: { color: textColor },
        grid: { drawOnChartArea: false },
      },
      x: {
        ticks: { color: textColor },
        grid: { display: false },
      },
    },
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          padding: 20,
          color: textColor,
        },
      },
    },
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* 탭 인터페이스 버튼 컨트롤러 */}
      <div className="flex justify-end gap-2 mb-4">
        {["realtime", "day", "week", "month", "alerts"].map((type) => (
          <button
            key={type}
            onClick={() => {
              setViewType(type);
              if (type !== "alerts") setSelectedDate(null);
            }}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition
              ${
                viewType === type
                  ? type === "realtime" || type === "alerts"
                    ? "bg-red-500 text-white"
                    : "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }
            `}
          >
            {type === "realtime"
              ? "● LIVE"
              : type === "alerts"
                ? "▲ ALERT LOG"
                : type.toUpperCase()}
          </button>
        ))}
      </div>

      {/* 대시보드 코어 콘텐츠 출력 컨테이너 */}
      <div className="flex-grow overflow-y-auto">
        {viewType === "alerts" ? (
          <div className="flex flex-col h-full bg-body rounded p-4 gap-4">
            {/* 달력 캘린더 헤더 */}
            <div className="flex items-center justify-center gap-6 font-bold text-lg pb-2 border-b">
              <button onClick={goPrevMonth}>◀</button>

              <span>
                {year} / {String(month + 1).padStart(2, "0")}
              </span>

              <button onClick={goNextMonth}>▶</button>
            </div>

            {/* 달력 7열 그리드 레이아웃 */}
            <div className="grid grid-cols-7 gap-1 text-center text-sm">
              {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                <div key={day} className="font-semibold pb-1">
                  {day}
                </div>
              ))}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2"></div>
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayData = alertsByDate[dateStr];
                const hasAlert = !!dayData;
                const isSelected = selectedDate === dateStr;

                let bgClass = "bg-[var(--color-calbg)] text-gray-700";
                if (hasAlert) {
                  bgClass =
                    dayData.level === "위험"
                      ? "bg-red-100 text-red-700 font-bold hover:bg-red-200"
                      : "bg-yellow-100 text-yellow-700 font-bold hover:bg-yellow-200";
                }

                return (
                  <div
                    key={day}
                    onClick={() => hasAlert && setSelectedDate(dateStr)}
                    className={`p-2 rounded cursor-pointer transition-all duration-200 
                      ${bgClass} 
                      ${isSelected ? "ring-2 ring-blue-500 shadow-md" : ""}
                      ${!hasAlert ? "opacity-50 cursor-default" : ""} 
                    `}
                  >
                    {day}
                  </div>
                );
              })}
            </div>

            {/* 개별 일자 알림 상세 타임라인 컨텍스트 */}
            {selectedDate && alertsByDate[selectedDate] && (
              <div className="mt-4 border-t pt-6 pb-2">
                <h3 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
                  <span>📅 {selectedDate} 상세 기록</span>
                </h3>

                <div className="relative border-l-2 border-gray-200 ml-3">
                  {alertsByDate[selectedDate].logs.map((log, index) => (
                    <div key={index} className="mb-6 ml-6 relative">
                      <span
                        className={`absolute -left-[1.85rem] top-1 w-4 h-4 rounded-full ring-4 ring-white
                        ${log.alert_level === "위험" ? "bg-red-500" : "bg-yellow-400"}
                      `}
                      ></span>

                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-gray-600">
                          {log.time}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-bold
                          ${log.alert_level === "위험" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700"}
                        `}
                        >
                          {log.alert_level}
                        </span>
                      </div>

                      <div className="bg-gray-50 border rounded p-3 shadow-sm hover:shadow-md transition">
                        <div className="font-bold text-gray-800 mb-1">
                          {log.alert_message}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          측정 온도:{" "}
                          <span className="font-semibold">
                            {log.temperature}°C
                          </span>{" "}
                          | 측정 습도:{" "}
                          <span className="font-semibold">{log.humidity}%</span>
                        </div>
                        <div className="text-xs text-blue-600 font-medium">
                          💡 Action: {log.action_guide}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* 핵심 제어 구문: key 데이터 영역에 상속된 currentTheme를 바인딩하여 무조건적인 리렌더링 전사 동기화 확보 */
          <Line data={chartConfig} options={options} key={currentTheme} />
        )}
      </div>
    </div>
  );
};

export default Chart;
