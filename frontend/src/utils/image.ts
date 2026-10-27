// Утилиты для работы с изображениями (вложения в чат)

export const MAX_ATTACHMENTS = 4;
// После ресайза до 1568px + JPEG q80 данные URI обычно < 1 МБ,
// но держим тот же лимит, что и на бэкенде (~10 МБ)
export const MAX_IMAGE_URI_LEN = 15_000_000;

/**
 * Файл -> data URI вида "data:image/jpeg;base64,..."
 * Картинка рисуется на белый фон, масштабируется до maxSide по длинной стороне
 * и перекодируется в JPEG с качеством quality.
 */
export async function fileToDataUri(
  file: File,
  maxSide = 1568,
  quality = 0.8,
): Promise<string> {
  const bitmap = await loadImage(file);

  let { width, height } = bitmap;
  if (width > maxSide || height > maxSide) {
    const scale = maxSide / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas недоступен');
  // Белый фон: JPEG не умеет прозрачность
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height);

  return canvas.toDataURL('image/jpeg', quality);
}

async function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file);
    } catch {
      // fallthrough к <img>
    }
  }
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Не удалось прочитать изображение'));
    };
    img.src = url;
  });
}

/** Фильтрует список файлов: только изображения, максимум maxCount */
export function pickImageFiles(files: FileList | File[] | null, maxCount = MAX_ATTACHMENTS): File[] {
  if (!files) return [];
  return Array.from(files)
    .filter((f) => f.type.startsWith('image/'))
    .slice(0, maxCount);
}
