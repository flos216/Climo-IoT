import powerImg from "../assets/power.png";
import { useNavigate } from "react-router-dom";

function Start() {
  const navigate = useNavigate();

  return (
    <div className="w-full h-screen bg-[#46A2F8] flex items-center justify-center">
      <button
        onClick={() => navigate("/dashboard")}
        className="w-[200px] h-[200px] bg-white rounded-full flex items-center justify-center shadow-xl hover:scale-105 transition"
      >
        <img src={powerImg} className="w-[120px] h-[120px]" />
      </button>
    </div>
  );
}

export default Start;
