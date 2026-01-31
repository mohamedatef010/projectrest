// src/lib/imageHelper.ts
export function getOptimizedImageUrl(url?: string, options?: {
  width?: number;
  height?: number;
  quality?: number;
}): string {
  if (!url || url.trim() === '') {
    const { width = 600, height = 400 } = options || {};
    return `https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-4.0.3&auto=format&fit=crop&w=${width}&h=${height}&q=80`;
  }

  // If it's already an Unsplash URL, add optimization parameters
  if (url.includes('unsplash.com')) {
    const unsplashUrl = new URL(url);
    unsplashUrl.searchParams.set('w', options?.width?.toString() || '600');
    unsplashUrl.searchParams.set('h', options?.height?.toString() || '400');
    unsplashUrl.searchParams.set('q', options?.quality?.toString() || '80');
    unsplashUrl.searchParams.set('fit', 'crop');
    return unsplashUrl.toString();
  }

  // For other URLs, return as-is
  return url;
}

export function getPlaceholderImage(type: 'menu' | 'hero' | 'restaurant' = 'menu'): string {
  const placeholders = {
    menu: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400&q=80',
    hero: 'https://images.unsplash.com/photo-1554679665-f5537f187268?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80',
    restaurant: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80'
  };
  
  return placeholders[type];
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>, fallback?: string) {
  const target = e.target as HTMLImageElement;
  target.src = fallback || getPlaceholderImage();
}