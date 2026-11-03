// Web Worker: decodifica, redimensiona y codifica fotos a JPEG fuera del hilo de la interfaz.
// Así la pantalla no se congela mientras el inspector toma o carga varias fotos.
self.onmessage = async (event) => {
  const { id, file, maxDimension, quality, thumbDimension } = event.data;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality });

    // Miniatura para la cuadrícula (evita descargar la foto completa en datos móviles)
    let thumbBlob = null;
    if (thumbDimension) {
      const t = Math.min(1, thumbDimension / Math.max(bitmap.width, bitmap.height));
      const thumb = new OffscreenCanvas(Math.round(bitmap.width * t), Math.round(bitmap.height * t));
      thumb.getContext('2d').drawImage(bitmap, 0, 0, thumb.width, thumb.height);
      thumbBlob = await thumb.convertToBlob({ type: 'image/jpeg', quality: 0.7 });
    }
    bitmap.close();
    self.postMessage({ id, blob, thumbBlob, width, height });
  } catch (err) {
    self.postMessage({ id, error: err?.message || 'No se pudo procesar la imagen' });
  }
};
