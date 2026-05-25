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

// ==================== 날짜별 호출 ====================

const fetchChartData = async (type) => {
  try {
    let url = "/data";

    if (type === "day") url = "/chart/day";
    if (type === "week") url = "/chart/week";
    if (type === "month") url = "/chart/month";

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`서버 오류: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("차트 데이터 불러오기 실패:", error);
    return null;
  }
};

// ==================== Flask API 호출 ====================

const fetchSensorData = async () => {
  try {
    const response = await fetch("/data");

    if (!response.ok) {
      throw new Error(`서버 오류: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error("센서 데이터 불러오기 실패:", error);
    return null;
  }
};

// ==================== Chart Component ====================

const Chart = () => {
  const showToast = useToast();

  const [viewType, setViewType] = useState("realtime");

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

  // ==================== 실시간 데이터 갱신 ====================

  useEffect(() => {
    const updateChart = async () => {
      if (viewType === "realtime") {
        const data = await fetchChartData("realtime");

        if (data) {
          const now = new Date();
          const timeStr = `${now.getHours()}:${now
            .getMinutes()
            .toString()
            .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`;

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

  // ==================== 표시 데이터 선택 ====================

  const displayData = useMemo(() => {
    return viewType === "realtime" ? realtimeData : historyData;
  }, [viewType, realtimeData, historyData]);

  // ==================== 차트 데이터 ====================

  const chartConfig = {
    labels: displayData.labels,

    datasets: [
      {
        label: "온도 (°C)",

        data: displayData.temp,

        borderColor: "#ef4444",

        backgroundColor: "rgba(239, 68, 68, 0.1)",

        yAxisID: "y_temp",

        tension: 0.4,

        fill: true,
      },

      {
        label: "습도 (%)",

        data: displayData.humi,

        borderColor: "#3b82f6",

        backgroundColor: "rgba(59, 130, 246, 0.1)",

        yAxisID: "y_humi",

        tension: 0.4,

        fill: true,
      },
    ],
  };

  // ==================== 차트 옵션 ====================

  const options = {
    responsive: true,

    maintainAspectRatio: false,

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
          color: "#ef4444",
        },
      },

      y_humi: {
        position: "right",

        min: 10,
        max: 90,

        title: {
          display: true,
          text: "습도 (%)",
          color: "#3b82f6",
        },
      },

      x: {
        grid: {
          display: false,
        },
      },
    },

    plugins: {
      legend: {
        position: "bottom",

        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
    },
  };

  // ==================== 화면 ====================

  return (
    <div className="w-full h-full flex flex-col">
      {/* 버튼 영역 */}
      <div className="flex justify-end gap-2 mb-4">
        {["realtime", "day", "week", "month"].map((type) => (
          <button
            key={type}
            onClick={() => setViewType(type)}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition

              ${
                viewType === type
                  ? type === "realtime"
                    ? "bg-red-500 text-white"
                    : "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }
            `}
          >
            {type === "realtime" ? "● LIVE" : type.toUpperCase()}
          </button>
        ))}
      </div>

      {/* 차트 */}
      <div className="flex-grow">
        <Line key={viewType} data={chartConfig} options={options} />
      </div>
    </div>
  );
};

export default Chart;
