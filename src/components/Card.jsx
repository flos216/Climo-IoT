function Card({ title, value, unit, status, onClick, trend }) {
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
    console.log("Card 클릭됨:", title);

    if (onClick) {
      onClick();
    }
  };

  return (
    <div
      onClick={handleClick}
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
        transition-all
        duration-300
        ${isStatusCard ? "cursor-pointer hover:scale-105" : ""}
      `}
    >
      <p className="absolute top-[27px] left-[39px]">{title}</p>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
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
          {trend === "up" && (
            <span className="text-2xl ml-2 text-[color:var(--color-temp)]">
              ▲
            </span>
          )}
          {trend === "down" && (
            <span className="text-2xl ml-2 text-[color:var(--color-humi)]">
              ▼
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

export default Card;
