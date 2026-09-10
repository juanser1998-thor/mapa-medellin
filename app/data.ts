import records from './appraisals.json';

export type Appraisal = {
  id: string;
  barrio: string;
  fecha: string;
  tipo: string;
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
  foto?: string;
};

// FID del Excel, verificado contra los atributos del SHP antes de la importación.
// Solo campos de exhibición; se omiten cliente, folios y dirección exacta.
export const appraisals: Appraisal[] = records;
