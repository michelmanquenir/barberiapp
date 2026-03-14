// Referencia ÚNICA para las libraries de Google Maps.
// Si cada componente define su propio ['places'], son arrays distintos
// en memoria y useJsApiLoader los detecta como "opciones distintas",
// lo que causa el banner "This page can't load Google Maps correctly".
export const GOOGLE_LIBRARIES = ['places']
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
