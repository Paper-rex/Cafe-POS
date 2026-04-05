const PEXELS_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const productImageCache = new Map<string, { url: string | null; expiresAt: number }>();

function cleanupProductImageCache() {
  const now = Date.now();
  for (const [key, value] of productImageCache.entries()) {
    if (value.expiresAt <= now) productImageCache.delete(key);
  }
}

async function fetchPexelsImage(productName: string) {
  const key = productName.trim().toLowerCase();
  if (!key) return null;

  const cached = productImageCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  const pexelsApiKey = (process.env.PEXELS_API_KEY || process.env.VITE_PEXELS_API_KEY || '').trim();
  if (!pexelsApiKey) {
    return null;
  }

  try {
    const query = encodeURIComponent(`${productName} food`);
    const response = await fetch(`https://api.pexels.com/v1/search?query=${query}&per_page=1`, {
      headers: {
        Authorization: pexelsApiKey,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      photos?: Array<{ src?: { medium?: string } }>;
    };

    const imageUrl = data.photos?.[0]?.src?.medium || null;
    productImageCache.set(key, {
      url: imageUrl,
      expiresAt: Date.now() + PEXELS_CACHE_TTL_MS,
    });
    return imageUrl;
  } catch {
    return null;
  }
}

type ProductWithImage = {
  name: string;
  imageUrl: string | null;
};

export async function withFallbackProductImages<T extends ProductWithImage>(products: T[]): Promise<T[]> {
  cleanupProductImageCache();

  return Promise.all(
    products.map(async (product) => {
      if (product.imageUrl) return product;

      const fallbackImage = await fetchPexelsImage(product.name);
      return {
        ...product,
        imageUrl: fallbackImage,
      };
    })
  );
}