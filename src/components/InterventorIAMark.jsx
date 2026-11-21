import React from 'react';

// Identidad de InterventorIA: tres tramos de vía de distinta altura (avance) con la marca
// amarilla de señalización bajo el que aún no reporta. Es el mismo lenguaje del tablero.
export function InterventorIAMark({ size = 28, tone = 'dark' }) {
  const bar = tone === 'dark' ? '#2b3138' : '#e9edf1';
  const track = tone === 'dark' ? '#c9ced4' : '#4a535c';
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      {[[3, 14], [13, 22], [23, 8]].map(([x, h]) => (
        <g key={x}>
          <rect x={x} y={4} width={7} height={22} rx={1} fill={track} />
          <rect x={x} y={26 - h} width={7} height={h} rx={1} fill={bar} />
        </g>
      ))}
      <rect x={23} y={28} width={7} height={2.5} rx={0.5} fill="#f2b705" />
    </svg>
  );
}

export function InterventorIAWordmark({ size = 28, tone = 'dark', showName = true }) {
  return (
    <span className="inline-flex items-center gap-2" aria-label="InterventorIA">
      <InterventorIAMark size={size} tone={tone} />
      {showName && (
        <span
          className={tone === 'dark' ? 'text-[#2b3138]' : 'text-white'}
          style={{ fontFamily: "'Archivo', 'Inter', sans-serif", fontStretch: '80%', fontWeight: 700, fontSize: size * 0.78, letterSpacing: '-0.01em', lineHeight: 1 }}
        >
          InterventorIA
        </span>
      )}
    </span>
  );
}

// Firma discreta para la marca blanca ("con InterventorIA")
export function PoweredByInterventorIA({ className = '' }) {
  return (
    <a
      href="/?mode=proyectos"
      className={`inline-flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-700 no-underline ${className}`}
      title="Ver todos los proyectos"
    >
      <InterventorIAMark size={14} />
      con InterventorIA
    </a>
  );
}
