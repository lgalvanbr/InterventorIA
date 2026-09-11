/**
 * imageCompressor.js - Utilidades centralizadas de procesamiento, compresión y subida de fotografías
 * Optimiza imágenes tomadas en campo en el navegador antes de enviarlas al servidor/Supabase Storage.
 */

/**
 * Comprime y redimensiona un archivo de imagen en el cliente.
 * Soporta corrección automática de orientación EXIF para fotos tomadas con dispositivos móviles.
 * 
 * @param {File|Blob} file Archivo de imagen a procesar
 * @param {Object} options Opciones de configuración
 * @param {number} [options.maxDimension=1600] Dimensión máxima permitida (ancho o alto)
 * @param {number} [options.quality=0.82] Calidad JPEG (0.0 a 1.0)
 * @param {string} [options.mimeType='image/jpeg'] Tipo MIME de salida
 * @returns {Promise<{base64: string, width: number, height: number, originalSize: number, approxSize: number}>}
 */
export async function compressImageFile(file, options = {}) {
  const {
    maxDimension = 1600,
    quality = 0.82,
    mimeType = 'image/jpeg'
  } = options;

  if (!file || !file.type.startsWith('image/')) {
    throw new Error('El archivo proporcionado no es una imagen válida.');
  }

  // Intentar usar createImageBitmap con orientación EXIF automática
  if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const { width, height } = calculateAspectDimensions(bitmap.width, bitmap.height, maxDimension);
      
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(bitmap, 0, 0, width, height);
      bitmap.close?.();

      const base64 = canvas.toDataURL(mimeType, quality);
      const approxSize = Math.round((base64.length * 3) / 4);

      return {
        base64,
        width,
        height,
        originalSize: file.size,
        approxSize
      };
    } catch {
      // Si falla createImageBitmap, continuar con el fallback tradicional
    }
  }

  // Fallback con FileReader e Image tradicional
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen en el navegador.'));
    reader.onload = (event) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Formato de imagen corrupto o no compatible.'));
      img.onload = () => {
        const { width, height } = calculateAspectDimensions(img.width, img.height, maxDimension);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const base64 = canvas.toDataURL(mimeType, quality);
        const approxSize = Math.round((base64.length * 3) / 4);

        resolve({
          base64,
          width,
          height,
          originalSize: file.size,
          approxSize
        });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Función de compatibilidad directa para componentes existentes.
 * Retorna directamente el string Base64 comprimido.
 */
export async function compressImage(file, maxWidth = 1600, maxHeight = 1600, quality = 0.82) {
  const maxDim = Math.max(maxWidth, maxHeight);
  const result = await compressImageFile(file, { maxDimension: maxDim, quality });
  return result.base64;
}

/**
 * Calcula dimensiones manteniendo la relación de aspecto exacta.
 */
function calculateAspectDimensions(srcWidth, srcHeight, maxDimension) {
  let width = srcWidth;
  let height = srcHeight;

  if (width > height) {
    if (width > maxDimension) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    }
  } else {
    if (height > maxDimension) {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  return { width, height };
}

/**
 * Genera el nombre estandarizado para archivos fotográficos de obra según convención del proyecto:
 * FECHA_YYYY-MM-DD_SEMXX_FRENTE_ID_TIMESTAMP_RANDOM.ext
 */
export function generateStandardPhotoFileName({ frenteId, semana, dateStr, originalName, prefix = 'FECHA' }) {
  const cleanDate = dateStr || new Date().toISOString().split('T')[0];
  const cleanSem = semana !== undefined && semana !== null ? String(semana) : 'XX';
  const cleanFrente = String(frenteId || 'frente').replace(/[^a-zA-Z0-9_]/g, '');
  const timestamp = Date.now().toString().slice(-6);
  const randomStr = Math.random().toString(36).substring(2, 6);
  
  let ext = '.jpeg';
  if (originalName) {
    const match = originalName.match(/\.(jpg|jpeg|png|webp|jfif|heic)$/i);
    if (match) ext = match[0].toLowerCase();
  }

  return `${prefix}_${cleanDate}_SEM${cleanSem}_FRENTE_${cleanFrente}_${timestamp}_${randomStr}${ext}`;
}

/**
 * Sube una fotografía intentando primero Supabase Storage (vía credenciales de cliente si existen)
 * o recurriendo al endpoint del servidor /api/upload-photo con resiliencia de error.
 */
export async function uploadPhotoResiliently({
  semana,
  frenteId,
  fileName,
  base64,
  supabaseConfig = null,
  bucket = 'frentes-fotos'
}) {
  let finalUrl = base64;
  let uploadedToCloud = false;

  // 1. Intentar subida directa a Supabase Storage si el cliente tiene credenciales
  if (supabaseConfig?.supabaseUrl && supabaseConfig?.supabaseKey) {
    try {
      const cleanSem = semana || 'general';
      const cleanFrente = frenteId || 'frente';
      const filePath = `semana_${cleanSem}/frente_${cleanFrente}/${fileName}`;
      const url = `${supabaseConfig.supabaseUrl}/storage/v1/object/${supabaseConfig.supabaseBucket || bucket}/${filePath}`;

      let base64Clean = base64;
      let contentType = 'image/jpeg';
      if (base64.includes(';base64,')) {
        const parts = base64.split(';base64,');
        const mimeMatch = parts[0].match(/data:(image\/[A-Za-z-+\/]+)/);
        if (mimeMatch) contentType = mimeMatch[1];
        base64Clean = parts[1];
      }

      const binaryStr = atob(base64Clean);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const uploadRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseConfig.supabaseKey}`,
          'apikey': supabaseConfig.supabaseKey,
          'Content-Type': contentType,
          'x-upsert': 'true'
        },
        body: bytes.buffer
      });

      if (uploadRes.ok) {
        finalUrl = `${supabaseConfig.supabaseUrl}/storage/v1/object/public/${supabaseConfig.supabaseBucket || bucket}/${filePath}`;
        uploadedToCloud = true;
      }
    } catch {
      // Falla silenciosa para continuar con el fallback al servidor
    }
  }

  // 2. Si no subió directamente, usar endpoint serverless /api/upload-photo
  if (!uploadedToCloud) {
    try {
      const response = await fetch('/api/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          semana: semana || 'general',
          frenteId: frenteId || 'frente',
          fileName,
          base64,
          bucket: supabaseConfig?.supabaseBucket || bucket
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.url) {
          finalUrl = result.url;
          uploadedToCloud = result.url.startsWith('http');
        }
      }
    } catch {
      // Si el servidor falla, se preserva el base64 comprimido local para no perder la foto
    }
  }

  return {
    url: finalUrl,
    uploadedToCloud
  };
}
