import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PerfectHitScreen: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/game', { replace: true });
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen bg-[#F0E1D1]">
      <img 
        src="/gaged-hit.svg" 
        alt="Perfect Hit" 
        className="w-64 h-64 object-contain" 
      />
    </div>
  );
};

export default PerfectHitScreen;
