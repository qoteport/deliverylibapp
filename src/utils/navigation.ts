// Lightweight URL and Path routing helper for AI Studio & Web
export type AppRoute = 
  | { name: 'home' }
  | { name: 'admin' }
  | { name: 'restaurant'; restaurantId: string }
  | { name: 'driver'; driverId?: string };

export function parseRoute(pathname: string, hash: string): AppRoute {
  const cleanPath = (hash && hash.startsWith('#/')) 
    ? hash.replace(/^#/, '') 
    : (pathname || '/');

  if (cleanPath.startsWith('/admin')) {
    return { name: 'admin' };
  }

  if (cleanPath.startsWith('/driver')) {
    const driverMatch = cleanPath.match(/^\/driver(?:\/|-portal\/)([a-zA-Z0-9_-]+)/);
    return { name: 'driver', driverId: driverMatch ? driverMatch[1] : undefined };
  }

  // Handle both /restaurant-management/:id and /resturant-management/:id (and without trailing id)
  const match = cleanPath.match(/^\/(?:restaurant|resturant)-management(?:\/([a-zA-Z0-9_-]+))?/);
  if (match) {
    return { name: 'restaurant', restaurantId: match[1] || '' };
  }

  return { name: 'home' };
}

export function navigateTo(route: AppRoute) {
  let url = '/';
  if (route.name === 'admin') {
    url = '/admin';
  } else if (route.name === 'restaurant') {
    url = route.restaurantId 
      ? `/resturant-management/${route.restaurantId}`
      : '/resturant-management';
  } else if (route.name === 'driver') {
    url = route.driverId ? `/driver/${route.driverId}` : '/driver';
  }

  try {
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  } catch (e) {
    window.location.hash = `#${url}`;
  }
}
