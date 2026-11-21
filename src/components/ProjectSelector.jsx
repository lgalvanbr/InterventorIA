import React, { useEffect, useState } from 'react';
import { Plus, MapPin } from 'lucide-react';
import { InterventorIAWordmark } from './InterventorIAMark';
import { projectHomeUrl } from '../data/projectSession';
import { brandInitials } from '../utils/brand';

// Pantalla de InterventorIA para elegir proyecto (fuera de la marca blanca de cada cliente)
export default function ProjectSelector() {
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'InterventorIA – Proyectos';
    fetch('/api/proyectos')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(setProjects)
      .catch(() => setError('No se pudieron cargar los proyectos. Revisa la conexión.'));
  }, []);

  return (
    <div className="min-h-screen bg-[#eef0f2] text-[#2b3138]">
      <header className="max-w-3xl mx-auto px-5 pt-10 pb-6 flex items-center justify-between gap-4">
        <InterventorIAWordmark size={30} />
        <a
          href="/?mode=nuevo-proyecto"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2b3138] text-white px-3.5 py-2 text-sm font-semibold no-underline hover:bg-[#3a424b]"
        >
          <Plus size={16} /> Nuevo proyecto
        </a>
      </header>

      <main className="max-w-3xl mx-auto px-5 pb-16">
        <h1 className="text-3xl sm:text-4xl leading-tight" style={{ fontFamily: "'Archivo', sans-serif", fontStretch: '80%', fontWeight: 700 }}>
          Elige un proyecto
        </h1>
        <p className="mt-2 text-slate-600 max-w-xl">
          Cada proyecto tiene sus contratos, frentes, semanas, fotos e inspectores por separado.
        </p>

        {error && <p role="alert" className="mt-6 text-sm font-semibold text-red-700">{error}</p>}
        {!projects && !error && <p className="mt-6 text-sm text-slate-500">Cargando proyectos…</p>}

        {projects && (
          <ul className="mt-8 flex flex-col gap-3">
            {projects.map(p => (
              <li key={p.id}>
                <a
                  href={projectHomeUrl(p.id)}
                  className="group flex items-center gap-4 rounded-xl bg-white px-4 py-4 no-underline text-inherit border border-transparent hover:border-[#c9ced4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#f2b705]"
                >
                  {p.marca?.logoUrl ? (
                    <img src={p.marca.logoUrl} alt="" className="w-12 h-12 rounded-lg object-contain bg-white border border-slate-200 shrink-0" />
                  ) : (
                    <span
                      className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                      style={{ background: p.marca?.color || '#2b3138', fontFamily: "'Archivo', sans-serif" }}
                      aria-hidden="true"
                    >
                      {brandInitials(p.marca?.nombre)}
                    </span>
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold text-base truncate">{p.nombre}</span>
                    <span className="block text-sm text-slate-500 truncate">
                      {p.marca?.nombre}{p.contratante ? ` para ${p.contratante}` : ''}
                    </span>
                    <span className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                      {p.ubicacion && (<><MapPin size={12} /> {p.ubicacion}. </>)}
                      {p.contratos} contrato{p.contratos === 1 ? '' : 's'}, {p.frentes} frentes
                    </span>
                  </span>
                  <span className="text-sm font-semibold text-slate-400 group-hover:text-[#2b3138]">Abrir</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
