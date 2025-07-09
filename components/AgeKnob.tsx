import React from 'react';

interface AgeKnobProps {
  value: number;
  onChange: (newValue: number) => void;
  min?: number;
  max?: number;
}

const AgeKnob: React.FC<AgeKnobProps> = ({ value, onChange, min = 16, max = 100 }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(Number(e.target.value));
  };

  return (
    <div className="relative w-40 h-40 flex items-center justify-center">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={handleChange}
        className="absolute w-full h-full opacity-0 cursor-pointer"
      />
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle
          cx="50"
          cy="50"
          r="45"
          stroke="#ff1818"
          strokeWidth="10"
          fill="none"
          strokeDasharray={283}
          strokeDashoffset={283 - ((value - min) / (max - min)) * 283}
          transform="rotate(-90 50 50)"
        />
      </svg>
      <div className="absolute text-2xl font-bold text-[#ff1818] select-none">
        {value}
      </div>
    </div>
  );
};

export default AgeKnob;
