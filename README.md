# Auditoria de Transportes

Aplicacion estatica para GitHub Pages. El formulario envia una auditoria completa en JSON a un flujo HTTP de Power Automate, que debe crear los datos en SharePoint.

## Publicar en GitHub Pages

1. Sube el contenido del repositorio a GitHub.
2. En `Settings > Pages`, selecciona `Deploy from a branch`, rama `main` y carpeta `/ (root)`.
3. Espera a que GitHub publique la URL.

La pagina no usa jQuery, Power Pages ni credenciales en el navegador. `Logo.png` es opcional; si no existe, se oculta.

## Configurar Power Automate

1. Crea una lista de SharePoint, por ejemplo `AuditoriasTransporte`, con columnas `Title`, `Fecha`, `Conductor`, `Unidad`, `Placas` y `Ruta`.
2. Crea un flujo con el disparador **When an HTTP request is received**.
3. Usa este esquema JSON en el disparador:

```json
{
    "type": "object",
    "properties": {
        "nombre": { "type": "string" },
        "fecha": { "type": "string" },
        "conductor": { "type": "string" },
        "unidad": { "type": "string" },
        "placas": { "type": "string" },
        "ruta": { "type": "string" },
        "pdfNombre": { "type": "string" },
        "pdfBase64": { "type": "string" },
        "puntos": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "numeroPunto": { "type": "integer" },
                    "pregunta": { "type": "string" },
                    "estatus": { "type": "string" },
                    "observacion": { "type": "string" },
                    "fotoBase64": { "type": "string" }
                }
            }
        }
    }
}
```

4. Agrega **Create item** en SharePoint y asigna las propiedades principales desde `body`.
5. Para guardar el checklist, recorre `puntos` con **Apply to each** y crea un elemento en una segunda lista, por ejemplo `AuditoriasTransporteDetalle`, relacionándolo con el ID del elemento principal.
6. Para cada `fotoBase64` no vacío, elimina el prefijo `data:image/jpeg;base64,` con `replace()` y usa **Create file** en una biblioteca de documentos. Guarda el nombre del archivo y la ruta en el detalle. No guardes la cadena Base64 completa en una columna de texto.
7. Agrega **Create file** en la biblioteca/carpeta destino. Usa `pdfNombre` como nombre y `base64ToBinary(triggerBody()?['pdfBase64'])` como contenido.
8. Guarda el flujo, copia la URL del disparador y reemplaza el valor vacío de `powerAutomateUrl` en `Auditoria de Transporte.es-ES.customjs.js`.

La URL del disparador es un secreto operativo: no la publiques en issues, documentación ni capturas. Al estar en una aplicación cliente, cualquier usuario de la página podría verla; protege el flujo con una validación adicional, un proxy autenticado o acceso restringido si los datos son sensibles.

## Prueba local

Abre el proyecto mediante un servidor HTTP local, no con `file://`:

```bash
python3 -m http.server 8000
```

Después visita `http://localhost:8000/`. El navegador puede bloquear la llamada a Power Automate por CORS; prueba el flujo desde la URL publicada en GitHub Pages y configura el origen permitido en el flujo o en el proxy que lo exponga.