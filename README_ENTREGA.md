# Mapa interactivo de avalúos — Medellín y entorno metropolitano

Esta carpeta contiene una copia independiente del proyecto para revisión técnica, demostración local o despliegue en un alojamiento diferente.

## Qué incluye

- Mapa 3D interactivo con los 18 avalúos que corresponden a los expedientes vigentes de la carpeta fuente.
- Pines de ubicación diferenciados por rangos de valor comercial.
- Galerías locales de fachada y espacios representativos para los avalúos especiales.
- Fichas anonimizadas con valor comercial, valor por metro cuadrado, áreas, descripción y metodología valuatoria.
- Menú central por inmueble con acceso al reto de trivia o a la ficha técnica.
- Doce hitos territoriales representados por esferas, con datos curiosos y minirretos.
- Selector central de hitos para elegir el lugar, ubicarlo en el mapa y abrir su experiencia territorial.
- Recorrido 3D alternado entre avalúos y puntos de interés, con tarjetas informativas que aparecen y se desvanecen en cada parada.
- Minijuego de cuatro preguntas por inmueble, con dirección, sector, tipología y régimen visibles antes de iniciar.
- Preguntas de rangos con una respuesta correcta, una alternativa cercana, una opción de duda fácilmente descartable y una alternativa deliberadamente absurda.
- Recursos locales de datos e imágenes; no requiere los PDF originales para funcionar.

La copia no incluye historial de control de versiones, dependencias instaladas, archivos de compilación, credenciales, documentos fuente ni datos identificadores de solicitantes o propietarios.

## Requisitos

- Node.js 22.13 o superior.
- npm.

## Ejecutar para revisión

1. Abrir una terminal dentro de esta carpeta.
2. Ejecutar `npm ci`.
3. Ejecutar `npm run dev -- --port 3001`.
4. Abrir `http://localhost:3001/`.

## Verificar el proyecto

- Tipos: `npx tsc --noEmit`
- Datos y capas: `node scripts/validate-map.mjs`
- Compilación: `npm run build`

## Archivos principales

- `app/page.tsx`: mapa, diálogos y experiencia principal.
- `app/map-pin.ts`: pines de los avalúos.
- `app/neon-sphere.ts`: esferas de los hitos territoriales.
- `app/landmarks.ts`: hitos, datos territoriales y retos locales.
- `app/landmark-challenge.tsx`: minirretos de ciudad.
- `app/trivia.tsx`: lógica de trivia e identificación visual.
- `app/appraisals.json`: conjunto final de 18 registros técnicos.
- `public/special-appraisals/`: galerías locales de los avalúos especiales.
- `scripts/validate-map.mjs`: validación de registros, imágenes y capas.

## Privacidad

Los expedientes fuente se transformaron en un conjunto técnico de exhibición. Las direcciones identifican exclusivamente los inmuebles avaluados; se excluyeron nombres de clientes o propietarios, identificaciones, datos de contacto, matrículas inmobiliarias, placas visibles y metadatos de las imágenes.
