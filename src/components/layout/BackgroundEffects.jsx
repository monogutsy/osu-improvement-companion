import React from 'react';
import './BackgroundEffects.css';

const BackgroundEffects = () => {
  return (
    <div className="bg-effects-container">
      <div className="bg-mesh-gradient"></div>
      <div className="bg-grid-overlay"></div>
      
      <div className="glow-orb orb-1"></div>
      <div className="glow-orb orb-2"></div>
      <div className="glow-orb orb-3"></div>
      <div className="glow-orb orb-4"></div>
      
      {[...Array(15)].map((_, i) => (
        <div key={i} className={`bg-particle particle-${i}`}></div>
      ))}
    </div>
  );
};

export default BackgroundEffects;