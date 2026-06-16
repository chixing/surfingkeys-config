function resolveImageUrl(imgElement: HTMLImageElement): string | null {
  let imageUrl = imgElement.src || imgElement.getAttribute('data-src') || imgElement.getAttribute('data-lazy-src');
  if (!imageUrl && imgElement.srcset) {
    const srcset = imgElement.srcset.split(',');
    imageUrl = srcset[0].trim().split(' ')[0];
  }
  return imageUrl || null;
}

async function copyPngToClipboard(blob: Blob | null, fallbackUrl: string): Promise<void> {
  try {
    if (!blob) throw new Error('Empty blob');
    const data = [new ClipboardItem({ 'image/png': blob })];
    await navigator.clipboard.write(data);
    api.Front.showBanner('Image copied to clipboard!', 'success');
  } catch {
    api.Clipboard.write(fallbackUrl);
    api.Front.showBanner('Copied URL (Clipboard write failed)', 'warning');
  }
}

function convertAndCopyImage(url: string): void {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => copyPngToClipboard(blob, url), 'image/png');
    }
  };
  img.onerror = () => {
    fetch(url)
      .then(r => r.blob())
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob);
        const img2 = new Image();
        img2.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img2.width;
          canvas.height = img2.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img2, 0, 0);
            canvas.toBlob(b => {
              URL.revokeObjectURL(blobUrl);
              copyPngToClipboard(b, url);
            }, 'image/png');
          }
        };
        img2.src = blobUrl;
      })
      .catch(() => {
        api.Clipboard.write(url);
        api.Front.showBanner('Copied URL (Image load failed)', 'warning');
      });
  };
  img.src = url;
}

export function copyImageToClipboard(): void {
  api.Hints.create('img', (element: HTMLElement) => {
    const imgElement = element as HTMLImageElement;
    const imageUrl = resolveImageUrl(imgElement);
    if (!imageUrl) {
      api.Front.showBanner('Could not find image source', 'error');
      return;
    }
    convertAndCopyImage(imageUrl);
  });
}
