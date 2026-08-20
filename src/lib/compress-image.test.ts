import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  MAX_IMAGE_BYTES,
  MAX_IMAGE_SIDE,
  compressImageToMaxKb,
  jpegUploadName,
  scaleImageToMaxSide,
} from '@/lib/compress-image';

describe('scaleImageToMaxSide', () => {
  it('no cambia dimensiones que ya caben', () => {
    expect(scaleImageToMaxSide(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('escala landscape para que el lado mayor sea 1600', () => {
    expect(scaleImageToMaxSide(3200, 1600)).toEqual({
      width: MAX_IMAGE_SIDE,
      height: 800,
    });
  });

  it('escala portrait para que el lado mayor sea 1600', () => {
    expect(scaleImageToMaxSide(800, 3200)).toEqual({
      width: 400,
      height: MAX_IMAGE_SIDE,
    });
  });
});

describe('jpegUploadName', () => {
  it('cambia la extensión a .jpg', () => {
    expect(jpegUploadName('foto.PNG')).toBe('foto.jpg');
  });

  it('deja el nombre si no tiene extensión', () => {
    expect(jpegUploadName('foto')).toBe('foto');
  });
});

describe('compressImageToMaxKb', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function installCanvas(opts: {
    naturalWidth: number;
    naturalHeight: number;
    blobSizes: number[];
    canvasUnavailable?: boolean;
    failLoad?: boolean;
  }) {
    const originalCreate = document.createElement.bind(document);
    const qualities: number[] = [];
    const canvasSize = { width: 0, height: 0 };
    let blobCall = 0;

    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreate(tagName);
      if (tagName === 'img') {
        Object.defineProperty(el, 'naturalWidth', {
          get: () => opts.naturalWidth,
        });
        Object.defineProperty(el, 'naturalHeight', {
          get: () => opts.naturalHeight,
        });
        Object.defineProperty(el, 'src', {
          set() {
            queueMicrotask(() => {
              if (opts.failLoad) {
                el.onerror?.(new Event('error'));
                return;
              }
              el.onload?.(new Event('load'));
            });
          },
        });
      }
      if (tagName === 'canvas') {
        const canvas = el as HTMLCanvasElement;
        Object.defineProperty(canvas, 'width', {
          get: () => canvasSize.width,
          set: (value: number) => {
            canvasSize.width = value;
          },
          configurable: true,
        });
        Object.defineProperty(canvas, 'height', {
          get: () => canvasSize.height,
          set: (value: number) => {
            canvasSize.height = value;
          },
          configurable: true,
        });
        canvas.getContext = () => {
          if (opts.canvasUnavailable) return null;
          return {
            drawImage: vi.fn(),
            fillRect: vi.fn(),
            fillStyle: '',
          } as unknown as CanvasRenderingContext2D;
        };
        canvas.toBlob = (callback, _type, quality) => {
          qualities.push(quality as number);
          const size =
            opts.blobSizes[Math.min(blobCall, opts.blobSizes.length - 1)];
          blobCall += 1;
          callback(new Blob([new Uint8Array(size)], { type: 'image/jpeg' }));
        };
      }
      return el;
    });

    return { qualities, canvasSize };
  }

  it('expone el tope de 250 KB', () => {
    expect(MAX_IMAGE_BYTES).toBe(250 * 1024);
  });

  it('reintenta bajando calidad hasta quedar bajo el tope', async () => {
    const { qualities } = installCanvas({
      naturalWidth: 800,
      naturalHeight: 600,
      blobSizes: [300 * 1024, 300 * 1024, 100 * 1024],
    });
    const file = new File([new Uint8Array(8)], 'foto.png', {
      type: 'image/png',
    });

    const blob = await compressImageToMaxKb(file);

    expect(blob.size).toBe(100 * 1024);
    expect(qualities).toEqual([0.85, 0.75, 0.65]);
  });

  it('escala el canvas cuando el lado mayor supera 1600', async () => {
    const { canvasSize } = installCanvas({
      naturalWidth: 3200,
      naturalHeight: 1600,
      blobSizes: [80 * 1024],
    });
    const file = new File([new Uint8Array(8)], 'foto.jpg', {
      type: 'image/jpeg',
    });

    await compressImageToMaxKb(file);

    expect(canvasSize).toEqual({ width: 1600, height: 800 });
  });

  it('acepta el blob si la calidad llega al mínimo aunque siga grande', async () => {
    installCanvas({
      naturalWidth: 800,
      naturalHeight: 600,
      blobSizes: [400 * 1024],
    });
    const file = new File([new Uint8Array(8)], 'foto.jpg', {
      type: 'image/jpeg',
    });

    const blob = await compressImageToMaxKb(file, 50 * 1024);

    expect(blob.size).toBe(400 * 1024);
  });
});
