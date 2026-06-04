function Card({ title, value, unit, status, onClick, trend, trendValue }) {
  const isStatusCard = title === "Status";

  let cardBg = "bg-[color:var(--color-bg)]";
  let valueColor = "text-primary";

  if (isStatusCard && status === "주의") {
    cardBg = "bg-[#fff2c9]";
    valueColor = "text-[#3f3f3f]";
  }

  if (isStatusCard && status === "경고") {
    cardBg = "bg-[#ffc9c9]";
    valueColor = "text-[#3f3f3f]";
  }

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      onClick={isStatusCard ? handleClick : undefined}
      className={`
        flex flex-col
        w-full
        max-w-[265px]
        mx-auto
        h-[180px]
        ${cardBg}
        rounded-2xl
        shadow-xl
        p-6
        relative
        overflow-visible
        transition-all
        duration-300
        ${isStatusCard ? "cursor-pointer hover:scale-105" : ""}
      `}
    >
      <p className="absolute top-[27px] left-[39px]">{title}</p>

      <div className="absolute inset-0 flex items-center justify-center">
        <p
          className={` 
            ${valueColor}
            font-bold
            ${isStatusCard ? "text-5xl" : "text-6xl"}
          `}
        >
          {value}
          {unit && <span className="text-xl ml-1">{unit}</span>}

          {/* index.css 변수를 적용하여 테마에 맞게 색상이 변하는 세모 기호 */}
          {trend && (
            <span className="relative group inline-block ml-2">
              <span
                className={`
        text-2xl cursor-help
        ${
          trend === "up"
            ? "text-[color:var(--color-temp)]"
            : "text-[color:var(--color-humi)]"
        }
                `}
              >
                {trend === "up" ? "▲" : "▼"}
              </span>

              <span
                className="
                  absolute
                  left-1/2
                  bottom-full
                  mb-2
                  -translate-x-1/2
                  whitespace-nowrap
                  rounded-lg
                  bg-[#3f3f3f]
                  px-3
                  py-2
                  text-xs
                  text-white
                  opacity-0
                  pointer-events-none
                  transition-opacity
                  duration-200
                  group-hover:opacity-100
                  z-[9999]
                "
              >
                5분 전 대비 {trendValue}
                {unit} {trend === "up" ? "상승" : "하락"}
              </span>
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export default Card;
