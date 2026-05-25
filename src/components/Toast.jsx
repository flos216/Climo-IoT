import React from "react";

const Toast = ({ message, onClose }) => {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/30">
      <div
        className="
          w-[calc(100%-40px)]
          max-w-[700px]
          min-h-[220px]
          rounded-[35px]
          bg-white
          text-black
          shadow-2xl
          border border-white/30
          flex flex-col
          items-center
          justify-center
          text-center
          px-10
          py-8
          relative
        "
      >
        <button
          onClick={onClose}
          className="
            absolute
            right-8
            top-6
            text-3xl
            text-black
            hover:opacity-60
            transition
          "
        >
          ✕
        </button>

        <div className="text-6xl mb-5">⚠️</div>

        <h4 className="text-red-400 text-sm font-bold tracking-[0.3em] uppercase mb-4">
          Sensor Alert
        </h4>

        <p className="text-3xl font-bold leading-snug whitespace-pre-line">
          {message}
        </p>
      </div>
    </div>
  );
};

export default Toast;
