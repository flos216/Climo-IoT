function Footer() {
  return (
    <div className="w-full flex justify-center pb-[15px] pt-[15px] bg-transparent relative z-10">
      <div
        className="
                absolute 
                inset-0
                left-[25px]
                right-[25px]
                bg-[color:var(--color-bgs)] 
                -z-10           
            "
      ></div>

      <p className="opacity-40 hover:opacity-70 transition">
        © 2026. Climo. All rights reserved.
      </p>
    </div>
  );
}
export default Footer;
