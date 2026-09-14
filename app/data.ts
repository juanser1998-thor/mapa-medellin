import records from './appraisals.json';

export type Appraisal = {
  id: string;
  barrio: string;
  fecha: string;
  tipo: string;
  regimen: 'PH' | 'NPH';
  estado: string;
  areaPrivada: number | null;
  areaConstruida: number | null;
  areaTerreno: number | null;
  unidad: string;
  valor: number;
  estrato: string;
  lng: number;
  lat: number;
  uso: string;
  sector: string;
  foto: string;
};

// FID del Excel, verificado contra los atributos del SHP antes de la importación.
// Solo avalúos con fachada asociada y campos de exhibición; se omiten cliente,
// códigos SIB, folios y dirección exacta.
export const appraisals = records as Appraisal[];
