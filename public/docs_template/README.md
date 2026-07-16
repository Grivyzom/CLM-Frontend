# Plantillas de documentos (docs_template)

Carpeta de entrada para plantillas HTML exportadas desde **Claude Design** (`.dc.html`).

## Nomenclatura de archivos

`TIPO__Nombre libre.dc.html` — el prefijo (separado por doble guion bajo `__`)
declara para qué tipo de contrato/documento sirve la plantilla:

| Prefijo | Tipo |
|---------|------|
| `RECURRENTE__` | Contrato recurrente |
| `PERPETUO__` | Contrato perpetuo |
| `PRO_BONO__` | Contrato pro bono |
| `INTERNO__` | Documento interno / propio |
| *(sin prefijo)* | **Global** — sirve para cualquier tipo |

Ejemplos: `INTERNO__Memorandum Grivyzom.dc.html`, `RECURRENTE__Contrato SaaS.dc.html`.

En el CLM, el dropdown de plantillas HTML solo muestra las del tipo de contrato
seleccionado más las globales.

## Flujo

1. Exporta tu diseño desde Claude Design y deja el archivo `.html` aquí,
   nombrado según la nomenclatura de arriba.
2. En el CLM, crea una plantilla con modo de origen **Código HTML** — el archivo
   aparece automáticamente en el dropdown de rutas (filtrado por tipo).
3. Al generar un documento, el backend adapta el archivo a página imprimible y
   produce el PDF con **WeasyPrint**, respetando el diseño (flexbox, grid,
   estilos inline).

## Qué hace el motor automáticamente

- Quita el scaffolding de preview (`<x-dc>`, `<x-import>`, `doc-page.js`) —
  no lo edites ni lo elimines tú, no hace falta.
- Convierte `size` y `margin` del `<x-import>` en tamaño/márgenes de página
  (soporta `letter`, `a4`, `legal`).
- El `<div slot="footer">` se repite al pie de **cada** página del PDF.
- El texto "Página 1 de 1" se reemplaza por numeración real (Página N de M).
- Fuente `Calibri` → `Carlito` (sustituto métrico idéntico; el servidor
  necesita el paquete `fonts-crosextra-carlito`).

## Variables

Puedes usar sintaxis de template Django dentro del HTML:

```html
<div>{{ cliente.nombre }}</div>
<div>{{ fecha_creacion|date:"d/m/Y" }}</div>
<div>{{ monto|default:"____________" }}</div>
```

Los placeholders entre corchetes (`[Nombre del destinatario]`) quedan tal cual
en el PDF — sirven para documentos que se completan a mano.

## Assets (logos, imágenes)

Deja las imágenes en `./assets/` y referéncialas relativo:
`<img src="assets/logo-grivyzom.png">`. Por seguridad el generador de PDF
**no** descarga recursos externos (http/https): solo archivos de esta carpeta.

> Nota: esta carpeta es pública (se sirve con el frontend). No dejes aquí
> documentos con datos reales — solo plantillas.
