export const LEGACY_SLIDES = [
  { key: 'page_1', file: 'page_1.html', title: 'Portada' },
  { key: 'page_2', file: 'page_2.html', title: 'Estructura operativa' },
  { key: 'page_2b', file: 'page_2b.html', title: 'Certificaciones' },
  { key: 'mapa-pereira', file: 'mapa-pereira.html', title: 'Mapa Pereira' },
  { key: 'page_3_operacional', file: 'page_3_operacional.html', title: 'Operacional' },
  {
    key: 'page_beneficios_vigilancia',
    file: 'page_beneficios_vigilancia.html',
    title: 'Beneficios vigilancia',
  },
  { key: 'page_video', file: 'page_video.html', title: 'Video' },
  { key: 'page_3', file: 'page_3.html', title: 'Propuesta técnica' },
  { key: 'page_4', file: 'page_4.html', title: 'Propuesta económica' },
  { key: 'page_5', file: 'page_5.html', title: 'Reinversión' },
  { key: 'page_cierre', file: 'page_cierre.html', title: 'Cierre' },
] as const;

export const SLIDE_SCRIPTS: Record<string, Record<string, unknown>> = {
  /** Estructura operativa: única diapositiva con gráfico 3D (donut regional). */
  page_2: { three: true },
  /** Propuesta económica: gráfico de torta (D3) por servicios. */
  page_4: { d3: true },
  'mapa-pereira': { leaflet: true, script: 'js/mapa-pereira.js' },
};
