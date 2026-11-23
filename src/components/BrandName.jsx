import React from 'react';
import { brandSite } from '../utils/brand';

// Nombre de la interventoría; enlaza a su sitio web cuando está configurado
export function BrandName({ marca, short = false, className = '' }) {
  const name = (short && marca?.nombreCorto) || marca?.nombre || '';
  const site = brandSite(marca);
  if (!site) return <span className={className}>{name}</span>;
  return (
    <a href={site} target="_blank" rel="noopener noreferrer" title={`Sitio web de ${marca?.nombre || name}`}
      className={`text-inherit no-underline hover:underline ${className}`}>
      {name}
    </a>
  );
}

// Emblema de la marca (logoUrl) a su proporción real; `size` es el ancho máximo
export function BrandEmblem({ marca, size = 28, className = '' }) {
  if (!marca?.logoUrl) return null;
  return (
    <img src={marca.logoUrl} alt={`Logo de ${marca.nombre || ''}`}
      className={`object-contain shrink-0 ${className}`} style={{ width: size, height: 'auto', maxHeight: size }} />
  );
}

// Logo completo sobre una tarjeta blanca (se ve bien en fondos oscuros); enlaza al sitio web
export function BrandLogoCard({ marca, height = 48, className = '' }) {
  if (!marca?.logoCompletoUrl) return null;
  const img = (
    <span className="block bg-white rounded-xl px-2.5 py-1.5 shadow-sm">
      <img src={marca.logoCompletoUrl} alt={marca.nombre || ''} className="block" style={{ height, width: 'auto' }} />
    </span>
  );
  const site = brandSite(marca);
  return site
    ? <a href={site} target="_blank" rel="noopener noreferrer" title={`Sitio web de ${marca.nombre || ''}`} className={`inline-block ${className}`}>{img}</a>
    : <span className={`inline-block ${className}`}>{img}</span>;
}

// Logo completo para informes impresos (logoCompletoUrl, si no el emblema)
export function BrandLogoFull({ marca, height = 44, className = '' }) {
  const src = marca?.logoCompletoUrl || marca?.logoUrl;
  if (!src) return null;
  return <img src={src} alt={`Logo de ${marca.nombre || ''}`} className={`object-contain shrink-0 ${className}`} style={{ height, width: 'auto' }} />;
}
