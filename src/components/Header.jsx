import React, { useState, useEffect } from "react";
import { requestFcmToken } from "../firebase";
import logoImg from "../assets/logo.png";
import settingImg from "../assets/setting.png";

function Header() {
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(
    localStorage.getItem("pushEnabled") === "true",
  );

  // ==================== 다크모드 전역 상태 제어 메커니즘 ====================
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const savedTheme = localStorage.getItem("theme");

      if (savedTheme === "dark") {
        return true;
      }

      if (savedTheme === "light") {
        return false;
      }

      return document.documentElement.classList.contains("dark");
    }

    return false;
  });
  const [tempDarkMode, setTempDarkMode] = useState(false);

  // 다크모드 토글 상태 돔(DOM) 동기화 트리거
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");

    if (savedTheme === "dark") {
      document.documentElement.classList.add("dark");
      setIsDarkMode(true);
    } else if (savedTheme === "light") {
      document.documentElement.classList.remove("dark");
      setIsDarkMode(false);
    }
  }, []);

  useEffect(() => {
    if (isModalOpen) {
      setTempDarkMode(isDarkMode);
    }
  }, [isModalOpen, isDarkMode]);

  // 알림 권한 확인
  useEffect(() => {
    setPushEnabled(localStorage.getItem("pushEnabled") === "true");
  }, []);

  const [config, setConfig] = useState({
    temp_warn: 27,
    temp_alert: 30,
    humi_warn: 60,
    humi_alert: 70,
  });

  useEffect(() => {
    if (isModalOpen) {
      fetch("/api/config")
        .then((res) => res.json())
        .then((data) => setConfig(data))
        .catch((err) => console.error("설정 파일 로드 실패:", err));
    }
  }, [isModalOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: Number(value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (config.temp_warn >= config.temp_alert) {
      alert("온도 주의 기준값은 경고 기준값보다 작아야 합니다.");
      return;
    }
    if (config.humi_warn >= config.humi_alert) {
      alert("습도 주의 기준값은 경고 기준값보다 작아야 합니다.");
      return;
    }

    try {
      const response = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        if (tempDarkMode) {
          document.documentElement.classList.add("dark");
          setIsDarkMode(true);
          localStorage.setItem("theme", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          setIsDarkMode(false);
          localStorage.setItem("theme", "light");
        }
        // Dashboard에게 설정 변경 알림
        window.dispatchEvent(new Event("configUpdated"));

        alert("설정이 성공적으로 저장되었습니다.");
        setIsModalOpen(false);
      } else {
        alert("서버 저장 중 오류가 발생했습니다.");
      }
    } catch (err) {
      console.error("설정 저장 실패:", err);
    }
  };

  const handleEnablePush = async () => {
    if (pushEnabled) {
      const token = localStorage.getItem("fcmToken");

      if (token) {
        await fetch("/api/fcm-token", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ token }),
        });
      }

      localStorage.setItem("pushEnabled", "false");
      localStorage.removeItem("fcmToken");
      setPushEnabled(false);

      alert("푸시 알림이 비활성화되었습니다.");
      return;
    }

    const token = await requestFcmToken();

    if (!token) {
      alert("알림 권한 허용이 필요합니다.");
      return;
    }

    const response = await fetch("/api/fcm-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    if (response.ok) {
      localStorage.setItem("pushEnabled", "true");
      localStorage.setItem("fcmToken", token);
      setPushEnabled(true);
      alert("푸시 알림 활성화 완료!");
    }
  };

  return (
    /* 💡 전체 배경색 매핑: body 변수 사용 */
    <div className="flex justify-between items-center px-[40px] py-[20px] relative z-[100] bg-[var(--color-body)] transition-colors duration-300">
      {/* 로고 영역 */}
      <div className="flex items-center gap-1">
        <img
          src={logoImg}
          alt="Climo Logo"
          className={`h-[40px] w-auto object-contain transition-all duration-300 ${
            isDarkMode ? "brightness-0 invert" : ""
          }`}
        />
        {/* 💡 기본 텍스트 색상 매핑: text-primary 사용 */}
        <div
          className="text-[32px] tracking-tight"
          style={{ color: "var(--color-text-primary)" }}
        >
          Climo
        </div>
      </div>

      {/* 우측 네비게이션 요소 (다크모드 토글, About, 세팅 아이콘) */}
      <div className="flex items-center gap-6">
        {/* About 섹션 */}
        <div
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* 💡 About 텍스트 전용 색상 매핑: text-about 사용 */}
          <div
            className="text-[32px] cursor-help opacity-90 hover:opacity-100 transition-all"
            style={{ color: "var(--color-text-about)" }}
          >
            About
          </div>

          {/* About 설명 카드 호버 레이아웃 (💡 카드 배경색: bg 변수 사용, 글자색: primary 변수 사용) */}
          {isHovered && (
            <div
              className="absolute top-0 right-[110%] w-[200px] h-[300px] border shadow-2xl rounded-2xl p-6 z-[110] animate-in fade-in slide-in-from-right-5 duration-200 flex flex-col"
              style={{
                backgroundColor: "var(--color-bg)",
                borderColor: "var(--color-bgs)",
                color: "var(--color-text-primary)",
              }}
            >
              <div className="flex-grow">
                <h4
                  className="text-lg mb-2"
                  style={{ color: "var(--color-text-point)" }}
                >
                  Service
                </h4>
                <p className="text-[13px] leading-relaxed opacity-90">
                  Climo는 라즈베리파이를 통해 실시간으로 환경 정보를 알려드리고
                  있습니다!
                </p>
              </div>

              <div
                className="h-[1px] my-4 opacity-30"
                style={{ backgroundColor: "var(--color-text-primary)" }}
              ></div>

              <div>
                <h4 className="text-[11px] font-bold uppercase mb-3 tracking-wider opacity-60">
                  TEAM Members
                </h4>
                <ul className="text-[12px] space-y-2">
                  <li className="flex justify-between">
                    <span className="font-semibold">이지원</span>
                    <span
                      className="font-medium text-[11px]"
                      style={{ color: "var(--color-text-point)" }}
                    >
                      Lead & DB
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-semibold">김나영</span>
                    <span className="opacity-70 text-[11px]">IoT Sensor</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-semibold">김민경</span>
                    <span className="opacity-70 text-[11px]">Frontend</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-semibold">김홍준</span>
                    <span className="opacity-70 text-[11px]">Flask Server</span>
                  </li>
                </ul>
              </div>
              {/* 말꼬리 사각형 배경 연동 */}
              <div
                className="absolute right-[-6px] top-4 w-3 h-3 rotate-45 border-t border-r"
                style={{
                  backgroundColor: "var(--color-bg)",
                  borderColor: "var(--color-bgs)",
                }}
              ></div>
            </div>
          )}
        </div>

        {/* 세팅 버튼 아이콘 (다크모드 시 아이콘 반전) */}
        <button
          onClick={() => setIsModalOpen(true)}
          className={`opacity-80 hover:opacity-100 transition-opacity focus:outline-none cursor-pointer ${isDarkMode ? "invert" : ""}`}
        >
          <img
            src={settingImg}
            alt="Settings"
            className="h-[40px] w-auto object-contain"
          />
        </button>

        <button
          onClick={handleEnablePush}
          className="
            flex items-center gap-1
            px-3 py-1.5
            rounded-2xl
            transition-all duration-200
            text-lg
            cursor-pointer
            focus:outline-none
            shadow-sm
          "
          style={{
            backgroundColor: pushEnabled
              ? "var(--color-bgs)"
              : "var(--color-bgs)",

            color: "var(--color-text-primary)",
          }}
          title={pushEnabled ? "Disable Notifications" : "Enable Notifications"}
        >
          <span>{pushEnabled ? "🔔" : "🔕"}</span>

          <span className="text-xs font-bold tracking-wider uppercase hidden sm:inline">
            {pushEnabled ? "NOTI ON" : "NOTI OFF"}
          </span>
        </button>
      </div>

      {/* 설정 변경 모달 다이얼로그 (💡 모달 본체 배경: bg 변수 사용) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200]">
          <div
            className="rounded-3xl p-8 w-[360px] shadow-2xl animate-in fade-in zoom-in-95 duration-150 border"
            style={{
              backgroundColor: "var(--color-body)",
              borderColor: "var(--color-body)",
              color: "var(--color-text-primary)",
            }}
          >
            <h3 className="text-xl mb-6 flex items-center gap-2">⚙️Setting</h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 온도 파트 */}
              <div className="space-y-2">
                <label className="text-base text-[var(--color-temp)] block">
                  🌡️temperature (°C)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[13px] opacity-60 block mb-1">
                      주의 수치
                    </span>
                    <input
                      type="number"
                      name="temp_warn"
                      value={config.temp_warn}
                      onChange={handleChange}
                      className="w-full border rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-blue-500"
                      style={{
                        backgroundColor: "var(--color-bg)",
                        borderColor: "var(--color-bgs)",
                      }}
                    />
                  </div>
                  <div>
                    <span className="text-[13px] opacity-60 block mb-1">
                      경고 수치
                    </span>
                    <input
                      type="number"
                      name="temp_alert"
                      value={config.temp_alert}
                      onChange={handleChange}
                      className="w-full border rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-blue-500 "
                      style={{
                        backgroundColor: "var(--color-bg)",
                        borderColor: "var(--color-bgs)",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 습도 파트 */}
              <div className="space-y-2">
                <label className="text-base text-[var(--color-humi)] block">
                  💧humidity (%)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[13px] opacity-60 block mb-1">
                      주의 수치
                    </span>
                    <input
                      type="number"
                      name="humi_warn"
                      value={config.humi_warn}
                      onChange={handleChange}
                      className="w-full border rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-emerald-500 "
                      style={{
                        backgroundColor: "var(--color-bg)",
                        borderColor: "var(--color-bgs)",
                      }}
                    />
                  </div>
                  <div>
                    <span className="text-[13px] opacity-60 block mb-1">
                      경고 수치
                    </span>
                    <input
                      type="number"
                      name="humi_alert"
                      value={config.humi_alert}
                      onChange={handleChange}
                      className="w-full border rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-emerald-500 "
                      style={{
                        backgroundColor: "var(--color-bg)",
                        borderColor: "var(--color-bgs)",
                      }}
                    />
                  </div>
                </div>
              </div>
              {/* Theme 토글 */}
              <div className="space-y-2 pt-2">
                <label className="text-base block">🌗 Theme</label>

                <div
                  className="flex items-center justify-between px-4 py-3 rounded-xl"
                  style={{
                    backgroundColor: "var(--color-bg)",
                    border: "1px solid var(--color-bgs)",
                  }}
                >
                  <span
                    className={`font-medium ${
                      !tempDarkMode ? "opacity-100" : "opacity-50"
                    }`}
                  >
                    ☀️ Light
                  </span>

                  <button
                    type="button"
                    onClick={() => setTempDarkMode(!tempDarkMode)}
                    className={`
                        relative w-[60px] h-[32px]
                        rounded-full transition-all duration-300
                        ${tempDarkMode ? "bg-gray-600" : "bg-sky-300"}
                    `}
                  >
                    <div
                      className={`
                          absolute top-[3px]
                          w-[26px] h-[26px]
                          bg-white rounded-full shadow-md
                          transition-all duration-300
                          ${tempDarkMode ? "left-[31px]" : "left-[3px]"}
                  `}
                    />
                  </button>

                  <span
                    className={`font-medium ${
                      tempDarkMode ? "opacity-100" : "opacity-50"
                    }`}
                  >
                    🌙 Dark
                  </span>
                </div>
              </div>

              {/* 하단 제어 인터페이스 버튼 */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 opacity-80 hover:opacity-100 font-medium py-2.5 rounded-xl text-sm transition-all border"
                  style={{
                    backgroundColor: "var(--color-bgs)",
                    borderColor: "var(--color-bgs)",
                    color: "var(--color-text-primary)",
                  }}
                >
                  취소
                </button>

                <button
                  type="submit"
                  className="flex-1 text-white font-medium py-2.5 rounded-xl text-sm transition-all duration-200 shadow-lg bg-[var(--color-button)] hover:brightness-110 shadow-[var(--color-humi)]/20"
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Header;
