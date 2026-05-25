function Card({ title, value, unit, status, onClick }) {
  const isStatusCard = title === "Status";

  let cardBg = "bg-[color:var(--color-bg)]";
  let valueColor = "text-[#3f3f3f]";

  if (isStatusCard && status === "주의") {
    cardBg = "bg-orange-500";
    valueColor = "text-white";
  }

  if (isStatusCard && status === "경고") {
    cardBg = "bg-red-600";
    valueColor = "text-white";
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
      <p className="absolute top-[27px] left-[39px] text-[#2f2f2f]">{title}</p>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <p
          className={`
            font-bold
            ${valueColor}
            ${isStatusCard ? "text-5xl" : "text-6xl"}
          `}
        >
          {value}
          {unit && <span className="text-xl ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  );
}

export default Card;
