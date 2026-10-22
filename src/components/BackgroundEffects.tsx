import React, { useMemo } from 'react';

export const BackgroundEffects: React.FC = () => {
  const dustParticles = useMemo(() => {
    return Array.from({ length: 28 }).map((_, i) => ({
      id: i,
      left: `${(i * 3.7 + Math.sin(i) * 5) % 100}%`,
      animationDuration: `${8 + ((i * 3) % 12)}s`,
      animationDelay: `${(i * 1.5) % 10}s`,
      size: `${2 + (i % 3)}px`
    }));
  }, []);

  return (
    <>
      {/* Точечная сетка и фон */}
      <div className="bg-grid" />

      {/* Кольца */}
      <div className="ring ring-1" />
      <div className="ring ring-2" />
      <div className="ring ring-3" />

      {/* Геометрия */}
      <div className="geo-layer">
        <div className="geo-shape sq1" />
        <div className="geo-shape sq2" />
        <div className="geo-shape c1" />
        <div className="geo-shape c2" />
        <div className="geo-shape tri" />
      </div>

      {/* Пыль */}
      <div id="dustLayer">
        {dustParticles.map(p => (
          <div
            key={p.id}
            className="dust"
            style={{
              left: p.left,
              bottom: '-10px',
              animationDuration: p.animationDuration,
              animationDelay: p.animationDelay,
              width: p.size,
              height: p.size
            }}
          />
        ))}
      </div>
    </>
  );
};
