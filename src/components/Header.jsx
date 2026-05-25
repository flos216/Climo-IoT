import React, { useState, useEffect } from "react"; //(Setting) useEffect 추가
import { requestFcmToken } from "../firebase";
import logoImg from "../assets/logo.png";
import settingImg from "../assets/setting.png"; // setting 이미지 임포트

function Header() {
  const [isHovered, setIsHovered] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false); // 모달 활성화 상태 (Setting)
  const [pushEnabled, setPushEnabled] = useState(
    localStorage.getItem("pushEnabled") === "true",
  );

  // 입력 폼 상태 관리 (초기값 설정) (Setting)
  const [config, setConfig] = useState({
    temp_warn: 27,
    temp_alert: 30,
    humi_warn: 60,
    humi_alert: 70,
  });

  // 알림 권한 확인
  useEffect(() => {
    setPushEnabled(localStorage.getItem("pushEnabled") === "true");
  }, []);

  // 컴포넌트 마운트 시 현재 서버에 저장된 임계치 가져오기 (Setting)
  useEffect(() => {
    if (isModalOpen) {
      fetch("/api/config")
        .then((res) => res.json())
        .then((data) => setConfig(data))
        .catch((err) => console.error("설정 파일 로드 실패:", err));
    }
  }, [isModalOpen]);

  // 입력값 핸들러 (Setting)
  const handleChange = (e) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: Number(value),
    }));
  };

  // 서버로 설정값 전송 (POST) (Setting)
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 예외 처리 (유효성 검사)
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
        alert("임계치 설정이 성공적으로 저장되었습니다.");
        // [추가]대시보드에 설정 변경 알림 보내기
        window.dispatchEvent(new Event("configUpdated"));
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
    <div className="flex justify-between items-center px-[40px] py-[20px] relative z-[100]">
      {/* 로고 영역 */}
      <div className="flex items-center gap-1">
        <img
          src={logoImg}
          alt="Climo Logo"
          className="h-[40px] w-auto object-contain"
        />
        <div className="text-[32px] tracking-tight">Climo</div>
      </div>

      {/* 우측 네비게이션 요소 (About 및 세팅 아이콘) */}
      <div className="flex items-center gap-3">
        {/* About 섹션 */}
        <div
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <div className="text-[32px] text-[var(--color-text-about)] cursor-help opacity-80 hover:opacity-100 transition-opacity">
            About
          </div>

          {/* 설명 사각형 (200px * 300px) */}
          {isHovered && (
            <div
              className="
              absolute top-0 right-[110%] 
              w-[200px] h-[300px] 
              bg-white border border-gray-100 shadow-2xl rounded-2xl p-6
              text-gray-800 z-[110]
              animate-in fade-in slide-in-from-right-5 duration-200
              flex flex-col
            "
            >
              <div className="flex-grow">
                <h4 className="text-blue-600 font-bold text-lg mb-2">
                  Service
                </h4>
                <p className="text-[13px] leading-relaxed text-gray-600">
                  Climo는 라즈베리파이를 통해 실시간으로 환경 정보를 알려드리고
                  있습니다!
                </p>
              </div>

              <div className="h-[1px] bg-gray-100 my-4"></div>

              <div>
                <h4 className="text-gray-400 text-[11px] font-bold uppercase mb-3 tracking-wider">
                  TEAM Members
                </h4>
                <ul className="text-[12px] space-y-2">
                  <li className="flex justify-between">
                    <span className="font-semibold">이지원</span>
                    <span className="text-blue-500 font-medium text-[11px]">
                      Lead & DB
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-semibold">김나영</span>
                    <span className="text-gray-500 text-[11px]">
                      IoT Sensor
                    </span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-semibold">김민경</span>
                    <span className="text-gray-500 text-[11px]">Frontend</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="font-semibold">김홍준</span>
                    <span className="text-gray-500 text-[11px]">
                      Flask Server
                    </span>
                  </li>
                </ul>
              </div>
              <div className="absolute right-[-6px] top-4 w-3 h-3 bg-white rotate-45 border-t border-r border-gray-100"></div>
            </div>
          )}
        </div>

        <button
          onClick={handleEnablePush}
          className={`
            px-6 py-3 rounded-full font-bold transition-all duration-300
            ${pushEnabled ? "bg-blue-500 text-white" : "bg-[#dcdcdc] text-[#7a7a7a]"}
          `}
        >
          {pushEnabled ? "✓ 알림 활성화" : "알림 비활성화"}
        </button>

        {/* 세팅 버튼 아이콘 */}
        <button
          onClick={() => setIsModalOpen(true)}
          className="opacity-75 hover:opacity-100 transition-opacity focus:outline-none"
        >
          <img
            src={settingImg}
            alt="Settings"
            className="h-[40px] w-auto object-contain"
          />
        </button>
      </div>

      {/* 설정 변경 모달 다이얼로그 오버레이 레이아웃 (Setting) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[200]">
          <div className="bg-white rounded-3xl p-8 w-[360px] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              ⚙️ 알람 임계치 제어 설정
            </h3>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 온도 파트 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-blue-600 block">
                  🌡️ 온도 기준값 설정 (°C)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-gray-400 block mb-1">
                      주의 수치
                    </span>
                    <input
                      type="number"
                      name="temp_warn"
                      value={config.temp_warn}
                      onChange={handleChange}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-400 block mb-1">
                      경고 수치
                    </span>
                    <input
                      type="number"
                      name="temp_alert"
                      value={config.temp_alert}
                      onChange={handleChange}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* 습도 파트 */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-emerald-600 block">
                  💧 습도 기준값 설정 (%)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] text-gray-400 block mb-1">
                      주의 수치
                    </span>
                    <input
                      type="number"
                      name="humi_warn"
                      value={config.humi_warn}
                      onChange={handleChange}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <span className="text-[11px] text-gray-400 block mb-1">
                      경고 수치
                    </span>
                    <input
                      type="number"
                      name="humi_alert"
                      value={config.humi_alert}
                      onChange={handleChange}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* 하단 제어 제어 인터페이스 버튼 */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-2.5 rounded-xl text-sm transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-xl text-sm transition-colors shadow-lg shadow-blue-500/20"
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
