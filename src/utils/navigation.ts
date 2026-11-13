// Lightweight URL and Path routing helper for AI Studio & Web
export type AppRoute = 
  | { name: 'home' }
  | { name: 'apps' }
  | { name: 'rides' }
  | { name: 'supermarket' }
  | { name: 'supermarket-onboarding' }
  | { name: 'supermarket-management'; supermarketId: string }
  | { name: 'real-estate' }
  | { name: 'lifestyle' }
  | { name: 'motors' }
  | { name: 'admin' }
  | { name: 'restaurant'; restaurantId: string }
  | { name: 'driver'; driverId?: string };

export function parseRoute(pathname: any, hash: any): AppRoute {
  const safeHash = typeof hash === 'string' ? hash : '';
  const safePathname = typeof pathname === 'string' ? pathname : '/';
  const cleanPath = (safeHash && safeHash.startsWith('#/')) 
    ? safeHash.replace(/^#/, '') 
    : (safePathname || '/');

  if (cleanPath.startsWith('/admin')) {
    return { name: 'admin' };
  }

  if (cleanPath.startsWith('/driver')) {
    const driverMatch = cleanPath.match(/^\/driver(?:\/|-portal\/)([a-zA-Z0-9_-]+)/);
    return { name: 'driver', driverId: driverMatch ? driverMatch[1] : undefined };
  }

  if (cleanPath.startsWith('/apps')) {
    return { name: 'apps' };
  }

  if (cleanPath.startsWith('/rides')) {
    return { name: 'rides' };
  }

  if (cleanPath.startsWith('/real-estate') || cleanPath.startsWith('/property') || cleanPath.startsWith('/rentals')) {
    return { name: 'real-estate' };
  }

  if (cleanPath.startsWith('/lifestyle') || cleanPath.startsWith('/electronics') || cleanPath.startsWith('/fashion') || cleanPath.startsWith('/clothing')) {
    return { name: 'lifestyle' };
  }

  if (cleanPath.startsWith('/motors') || cleanPath.startsWith('/cars') || cleanPath.startsWith('/auto')) {
    return { name: 'motors' };
  }

  // Shopping / Supermarket Management portal: /shopping-management/:id or /supermarket-management/:id
  const smManageMatch = cleanPath.match(/^\/(?:shopping|supermarket)-management(?:\/([a-zA-Z0-9_-]+))?/);
  if (smManageMatch) {
    const id = smManageMatch[1];
    if (id === 'onboarding' || id === 'register') {
      return { name: 'supermarket-onboarding' };
    }
    return { name: 'supermarket-management', supermarketId: id || '' };
  }

  if (cleanPath.startsWith('/register-shopping') || cleanPath.startsWith('/register-supermarket') || cleanPath.startsWith('/supermarket-onboarding') || cleanPath.startsWith('/shopping-onboarding')) {
    return { name: 'supermarket-onboarding' };
  }

  if (cleanPath.startsWith('/shopping') || cleanPath.startsWith('/supermarket') || cleanPath.startsWith('/grocery')) {
    return { name: 'supermarket' };
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
  } else if (route.name === 'apps') {
    url = '/apps';
  } else if (route.name === 'rides') {
    url = '/rides';
  } else if (route.name === 'real-estate') {
    url = '/real-estate';
  } else if (route.name === 'lifestyle') {
    url = '/lifestyle';
  } else if (route.name === 'motors') {
    url = '/motors';
  } else if (route.name === 'supermarket') {
    url = '/supermarket';
  } else if (route.name === 'supermarket-onboarding') {
    url = '/register-supermarket';
  } else if (route.name === 'supermarket-management') {
    url = route.supermarketId
      ? `/supermarket-management/${route.supermarketId}`
      : '/supermarket-management';
  }

  try {
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  } catch (e) {
    window.location.hash = `#${url}`;
  }
}
