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
| `REQUERIMIENTO__` | Ficha de Requerimiento |
| `ERS__` | Especificación de Requerimientos |
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
- **Convierte en variables los huecos de llenado a mano** (ver más abajo).

## Variables

Puedes usar sintaxis de template Django dentro del HTML:

```html
<div>{{ cliente.nombre }}</div>
<div>{{ fecha_creacion|date:"d/m/Y" }}</div>
<div>{{ monto|default:"____________" }}</div>
```

Todo `{{ nombre }}` que no sea una variable del contrato se convierte en un
campo del formulario que el usuario llena antes de generar el documento.

### Auto-variabilización

Una plantilla diseñada para **imprimir y llenar a mano** produce un PDF que el
CLM no puede rellenar. Para evitarlo, el motor detecta los huecos de llenado y
los convierte en variables por su cuenta:

| Hueco en el diseño | Se convierte en |
|---|---|
| `<span style="border-bottom">&nbsp;</span>` | campo de una línea |
| `<div style="border; min-height:70px"></div>` | campo multilínea (textarea) |
| `<td>&nbsp;</td>` en una tabla | campo, nombrado por su fila y columna |
| `[Nombre del Proyecto]` | campo, con el corchete como valor por defecto |

El nombre sale de la etiqueta vecina en el documento (el `<th>` de la fila, el
texto anterior, o el encabezado de la sección). Si esa etiqueta corresponde a un
dato que el CLM ya conoce — Cliente, Fecha, Proyecto, RUT, Responsable — el
campo se engancha al contrato y **sale relleno solo**, sin pedírselo al usuario.

Los corchetes siguen imprimiéndose igual que antes cuando nadie llena el campo:
pasan a ser el valor por defecto de la variable, no desaparecen.

**Nada de esto toca los archivos**: la conversión ocurre en memoria al leer la
plantilla. Un `.dc.html` se puede re-exportar desde Claude Design y reemplazar
sin perder trabajo.

### Cuando NO quieras que el motor intervenga

```html
<x-import size="letter" data-no-autovar>   <!-- desactiva el archivo entero -->
<div data-fijo>…</div>                     <!-- protege un hueco concreto -->
```

Úsalo para lo que debe imprimirse en blanco de verdad: firmas manuscritas,
timbres, o un corchete que sea texto literal del documento.

### Comprobar una plantilla nueva

```bash
python manage.py auditar_plantillas_html --detalle
```

Lista, por plantilla, qué variables se rellenan solas y cuáles se le piden al
usuario. Termina con error si alguna no expone ninguna variable — el caso que
hay que evitar. El catálogo muestra el mismo conteo al elegir el archivo.

## Assets (logos, imágenes)

Deja las imágenes en `./assets/` y referéncialas relativo:
`<img src="assets/logo-grivyzom.png">`. Por seguridad el generador de PDF
**no** descarga recursos externos (http/https): solo archivos de esta carpeta.

> Nota: esta carpeta es pública (se sirve con el frontend). No dejes aquí
> documentos con datos reales — solo plantillas.
