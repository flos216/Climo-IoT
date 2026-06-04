import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import powerImg from "../assets/power.png";

function Start() {
  const navigate = useNavigate();
  const [loadingProgress, setLoadingProgress] = useState(0); // 로딩 게이지 상태
  const [isLoaded, setIsLoaded] = useState(false); // 로딩 완료 여부
  const [isError, setIsError] = useState(false); // 서버 및 네트워크 에러 여부

  // 로딩 및 API 호출 로직 (재사용 함수)
  const initLoadingSequence = () => {
    // 만약 완전히 오프라인 상태라면 애초에 로딩을 시작하지 않고 에러를 띄움
    if (!navigator.onLine) {
      setIsError(true);
      return;
    }

    setIsError(false);
    setLoadingProgress(0);
    setIsLoaded(false);

    // 1. 게이지를 0%에서 85%까지 채우는 타이머
    const progressTimer = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 85) {
          clearInterval(progressTimer);
          return 85;
        }
        return prev + 5;
      });
    }, 50);

    // 2. 실제 서버의 데이터 로딩 수행
    const fetchInitialData = async () => {
      try {
        const response = await fetch("/data");
        if (response.ok) {
          clearInterval(progressTimer);
          setLoadingProgress(100);
          setTimeout(() => setIsLoaded(true), 400);
        } else {
          throw new Error("서버 상태 불안정");
        }
      } catch (error) {
        console.error("초기 로딩 실패:", error);
        clearInterval(progressTimer);
        setIsError(true);
      }
    };

    fetchInitialData();
    return progressTimer;
  };

  useEffect(() => {
    // 최초 마운트 시 로딩 시퀀스 가동
    let activeTimer = initLoadingSequence();

    // 🌟 [핵심 추가] 브라우저 자체의 실시간 네트워크 단절/연결 이벤트 리스너
    const handleNetworkOffline = () => {
      console.log("인터넷 연결 끊김 감지!");
      if (activeTimer) clearInterval(activeTimer); // 구동 중이던 게이지 타이머 정지
      setIsLoaded(false);
      setIsError(true); // 그 자리에서 즉시 [다시 시도] 에러 화면으로 전환
    };

    const handleNetworkOnline = () => {
      console.log("인터넷 연결 회복됨!");
      // 인터넷이 다시 연결되면 자동으로 로딩 시퀀스를 재시작해줄 수도 있음
    };

    // 브라우저 이벤트 등록 (인터넷이 끊기는 순간을 상시 감시)
    window.addEventListener("offline", handleNetworkOffline);
    window.addEventListener("online", handleNetworkOnline);

    // 컴포넌트 언마운트 시 리스너 및 타이머 전사 해제 (메모리 누수 방지)
    return () => {
      if (activeTimer) clearInterval(activeTimer);
      window.removeEventListener("offline", handleNetworkOffline);
      window.removeEventListener("online", handleNetworkOnline);
    };
  }, []);

  return (
    <div className="w-full h-screen bg-[#46A2F8] flex items-center justify-center p-6">
      {/* 1. 기본 로딩 상태 UI */}
      {!isLoaded && !isError && (
        <div className="flex flex-col items-center gap-4 w-full max-w-[300px] animate-fade-in">
          <div className="w-full h-[6px] bg-white/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-300 ease-out rounded-full"
              style={{ width: `${loadingProgress}%` }}
            ></div>
          </div>
          <span className="text-white font-medium tracking-wider text-sm">
            {loadingProgress === 100
              ? "READY"
              : `CONNECTING SERVER... ${loadingProgress}%`}
          </span>
        </div>
      )}

      {/* 2. 서버 연결 실패 및 실시간 단절 시 타깃 UI */}
      {!isLoaded && isError && (
        <div className="flex flex-col items-center gap-5 w-full max-w-[320px] text-center animate-fade-in">
          <div className="text-white text-4xl animate-bounce">⚠️</div>
          <div className="flex flex-col gap-1">
            <span className="text-white font-bold text-lg">
              서버 연결에 실패하였습니다.
            </span>
            <span className="text-white/80 text-sm">
              네트워크 상태를 확인한 후 다시 시도해 주세요.
            </span>
          </div>
          <button
            onClick={initLoadingSequence}
            className="mt-2 px-6 py-2.5 bg-white text-[#46A2F8] font-bold rounded-xl shadow-md hover:bg-opacity-90 active:scale-95 transition"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* 3. 로딩 완료 시 나타나는 전원 버튼 UI */}
      {isLoaded && !isError && (
        <button
          onClick={() => navigate("/dashboard")}
          className="w-[200px] h-[200px] bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 active:scale-95 transition-all duration-500 animate-fade-in-up"
          style={{ animationFillMode: "forwards" }}
        >
          <img src={powerImg} className="w-[120px] h-[120px]" />
        </button>
      )}
    </div>
  );
}

export default Start;
