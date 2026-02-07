# Modelo Vosk para transcripción de audio del sistema

Para transcribir el audio del sistema (Meet, Zoom, Teams) necesitas descargar un modelo de Vosk en español.

## Pasos

1. Descarga el modelo pequeño en español desde: https://alphacephei.com/vosk/models  
   - Modelo recomendado: **vosk-model-small-es-0.42** (~42 MB)

2. El modelo viene en formato `.zip`. Extrae el archivo.

3. Crea un archivo `model.tar.gz` con el contenido extraído:
   - En Windows (PowerShell): `tar -czvf model.tar.gz -C ruta\vosk-model-small-es-0.42 .`
   - En macOS/Linux: `tar -czvf model.tar.gz -C vosk-model-small-es-0.42 .`

4. Coloca `model.tar.gz` en esta carpeta (`public/vosk-model/`).

5. La URL final debe ser: `/vosk-model/model.tar.gz`

## Alternativa: otra URL

Puedes configurar una URL distinta con la variable de entorno:

```
NEXT_PUBLIC_VOSK_MODEL_URL=https://tu-cdn.com/modelo.tar.gz
```
