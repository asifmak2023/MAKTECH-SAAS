export default function CreatorCredit() {
  return (
    <div className="group fixed bottom-3 left-4 z-40 flex items-center gap-2 opacity-70 transition-opacity duration-300 hover:opacity-100 sm:bottom-4 sm:left-5">
      <span
        aria-hidden
        className="block h-px w-4 bg-[#d4d4d4] transition-all duration-300 group-hover:w-6 group-hover:bg-black"
      />
      <a
        href="https://wa.me/923303696062"
        target="_blank"
        rel="noreferrer"
        aria-label="Credits to Muhammad Asif — WhatsApp +92 330 3696062"
        className="font-label text-[11px] font-medium tracking-[0.4px] text-[#a3a3a3] transition-colors hover:text-black"
      >
        Credits to Muhammad Asif
      </a>
      <span className="hidden max-w-0 overflow-hidden whitespace-nowrap text-[10px] font-medium text-black opacity-0 transition-all duration-300 group-hover:max-w-[13rem] group-hover:opacity-100 sm:inline">
        WhatsApp · +92 330 3696062
      </span>
    </div>
  );
}
