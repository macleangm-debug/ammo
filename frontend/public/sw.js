const CACHE_NAME = 'ammo-cache-v2';
const DYNAMIC_CACHE = 'ammo-dynamic-v2';
const OFFLINE_PAGE = '/offline.html';

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// API endpoints to cache for offline
const API_CACHE_PATTERNS = [
  '/api/member/courses',
  '/api/citizen/profile',
  '/api/citizen/responsibility',
  '/api/marketplace/products',
  '/api/marketplace/categories'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing Service Worker v2');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => {
        console.error('[SW] Failed to cache:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating Service Worker v2');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== DYNAMIC_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - Network first, fallback to cache with offline page
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    // Handle POST requests for offline sync
    if (request.method === 'POST' && url.pathname.includes('/api/')) {
      event.respondWith(handleOfflinePost(request));
    }
    return;
  }

  // Handle API requests
  if (url.pathname.includes('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle navigation and static assets
  event.respondWith(handleStaticRequest(request));
});

// Handle API requests with network-first, cache-fallback strategy
async function handleApiRequest(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  try {
    const response = await fetch(request);
    
    // Cache successful GET responses for cacheable endpoints
    if (response.ok && shouldCacheApi(request.url)) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving cached API response:', request.url);
      return cachedResponse;
    }
    
    // Return offline JSON response
    return new Response(
      JSON.stringify({ 
        error: 'offline', 
        message: 'You are offline. Data will sync when connection is restored.',
        cached: false
      }),
      { 
        status: 503, 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  const cache = await caches.open(CACHE_NAME);
  
  try {
    // Try network first for fresh content
    const response = await fetch(request);
    
    // Cache the response
    if (response.ok) {
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await cache.match(OFFLINE_PAGE);
      if (offlinePage) {
        return offlinePage;
      }
      // Fallback to root
      return cache.match('/');
    }
    
    return new Response('Offline', { status: 503 });
  }
}

// Handle offline POST requests
async function handleOfflinePost(request) {
  try {
    return await fetch(request);
  } catch (error) {
    // Store for later sync
    const requestData = await request.clone().json();
    await storeForSync(request.url, requestData);
    
    return new Response(
      JSON.stringify({ 
        offline: true, 
        message: 'Request queued for sync when online',
        queued_at: new Date().toISOString()
      }),
      { 
        status: 202, 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Check if API endpoint should be cached
function shouldCacheApi(url) {
  return API_CACHE_PATTERNS.some(pattern => url.includes(pattern));
}

// Store requests for background sync
async function storeForSync(url, data) {
  const syncStore = await caches.open('sync-store');
  const syncData = {
    url,
    data,
    timestamp: new Date().toISOString()
  };
  
  // Get existing sync queue
  const queueResponse = await syncStore.match('sync-queue');
  let queue = [];
  if (queueResponse) {
    queue = await queueResponse.json();
  }
  
  queue.push(syncData);
  
  // Store updated queue
  await syncStore.put('sync-queue', new Response(JSON.stringify(queue)));
  
  // Request background sync if available
  if ('sync' in self.registration) {
    self.registration.sync.register('sync-requests');
  }
}

// Push notification event
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'AMMO Alert',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'ammo-notification',
    data: { url: '/' }
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = {
        title: data.title || notificationData.title,
        body: data.body || data.message || notificationData.body,
        icon: data.icon || notificationData.icon,
        badge: data.badge || notificationData.badge,
        tag: data.tag || 'ammo-' + Date.now(),
        data: {
          url: data.url || '/',
          type: data.type,
          id: data.id
        },
        actions: [
          { action: 'view', title: 'View' },
          { action: 'dismiss', title: 'Dismiss' }
        ],
        vibrate: [100, 50, 100],
        requireInteraction: data.severity === 'critical'
      };
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // If app is open, focus it
          for (const client of clientList) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              client.focus();
              client.navigate(urlToOpen);
              return;
            }
          }
          // Otherwise, open new window
          return clients.openWindow(urlToOpen);
        })
    );
  }
});

// Background sync event
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-requests' || event.tag === 'sync-transactions') {
    event.waitUntil(processSyncQueue());
  }
});

// Process queued sync requests
async function processSyncQueue() {
  const syncStore = await caches.open('sync-store');
  const queueResponse = await syncStore.match('sync-queue');
  
  if (!queueResponse) return;
  
  const queue = await queueResponse.json();
  const failedRequests = [];
  
  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.data),
        credentials: 'include'
      });
      
      if (!response.ok) {
        failedRequests.push(item);
      } else {
        console.log('[SW] Synced request:', item.url);
      }
    } catch (error) {
      console.error('[SW] Sync failed:', error);
      failedRequests.push(item);
    }
  }
  
  // Update queue with failed requests only
  if (failedRequests.length > 0) {
    await syncStore.put('sync-queue', new Response(JSON.stringify(failedRequests)));
  } else {
    await syncStore.delete('sync-queue');
  }
  
  // Notify clients about sync completion
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_COMPLETE',
      synced: queue.length - failedRequests.length,
      failed: failedRequests.length
    });
  });
}

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-data') {
    event.waitUntil(updateCachedData());
  }
});

async function updateCachedData() {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  // Refresh cached API data
  for (const pattern of API_CACHE_PATTERNS) {
    try {
      const response = await fetch(pattern, { credentials: 'include' });
      if (response.ok) {
        await cache.put(pattern, response);
      }
    } catch (error) {
      console.log('[SW] Could not update cache for:', pattern);
    }
  }
}

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => {
        return Promise.all(names.map((name) => caches.delete(name)));
      })
    );
  }
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
