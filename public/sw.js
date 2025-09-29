/**
 * Service Worker for Nigerian Network Optimizations
 * Offline support, caching, and background sync
 */

const CACHE_NAME = 'callwaiting-ai-v1';
const API_CACHE_NAME = 'callwaiting-api-v1';

// Files to cache for offline support
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/business-dashboard.html',
    '/chat-widget.js',
    '/voice-only-ai.html',
    '/manifest.json',
    // Add other static assets
];

// API endpoints to cache
const API_ENDPOINTS = [
    '/api/health',
    '/api/chat/config',
    '/api/dashboard/stats'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker installing...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Caching static assets...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('Static assets cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('Failed to cache static assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker activating...');
    
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
                            console.log('Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('Service Worker activated');
                return self.clients.claim();
            })
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Handle API requests with network-first strategy
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(handleApiRequest(request));
        return;
    }

    // Handle static assets with cache-first strategy
    if (request.method === 'GET') {
        event.respondWith(handleStaticRequest(request));
        return;
    }
});

// API request handler with network-first strategy
async function handleApiRequest(request) {
    const cache = await caches.open(API_CACHE_NAME);
    
    try {
        // Try network first
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Network failed, trying cache for:', request.url);
        
        // Fallback to cache if network fails
        const cachedResponse = await cache.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline response if no cache
        return new Response(
            JSON.stringify({
                error: true,
                message: 'You are offline. Please check your connection.',
                offline: true
            }),
            {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
            }
        );
    }
}

// Static asset request handler with cache-first strategy
async function handleStaticRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    
    // Try cache first
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        // Fallback to network
        const networkResponse = await fetch(request);
        
        // Cache the response
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('Failed to fetch:', request.url);
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            const offlineResponse = await cache.match('/index.html');
            return offlineResponse || new Response('Offline', { status: 503 });
        }
        
        throw error;
    }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('Background sync triggered:', event.tag);
    
    if (event.tag === 'chat-message') {
        event.waitUntil(syncChatMessages());
    } else if (event.tag === 'dashboard-data') {
        event.waitUntil(syncDashboardData());
    }
});

// Sync chat messages when back online
async function syncChatMessages() {
    try {
        const cache = await caches.open('offline-actions');
        const requests = await cache.keys();
        
        for (const request of requests) {
            if (request.url.includes('/api/chat/message')) {
                try {
                    const response = await fetch(request);
                    if (response.ok) {
                        await cache.delete(request);
                        console.log('Synced chat message:', request.url);
                    }
                } catch (error) {
                    console.error('Failed to sync chat message:', error);
                }
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Sync dashboard data when back online
async function syncDashboardData() {
    try {
        const cache = await caches.open('offline-actions');
        const requests = await cache.keys();
        
        for (const request of requests) {
            if (request.url.includes('/api/dashboard/')) {
                try {
                    const response = await fetch(request);
                    if (response.ok) {
                        await cache.delete(request);
                        console.log('Synced dashboard data:', request.url);
                    }
                } catch (error) {
                    console.error('Failed to sync dashboard data:', error);
                }
            }
        }
    } catch (error) {
        console.error('Background sync failed:', error);
    }
}

// Push notification handling
self.addEventListener('push', (event) => {
    console.log('Push notification received');
    
    const options = {
        body: event.data ? event.data.text() : 'New notification from CallWaiting.ai',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        },
        actions: [
            {
                action: 'explore',
                title: 'View Dashboard',
                icon: '/icons/checkmark.png'
            },
            {
                action: 'close',
                title: 'Close',
                icon: '/icons/xmark.png'
            }
        ]
    };
    
    event.waitUntil(
        self.registration.showNotification('CallWaiting.ai', options)
    );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
    console.log('Notification clicked:', event.action);
    
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/business-dashboard.html')
        );
    }
});

// Connection status monitoring
let connectionStatus = 'online';

self.addEventListener('online', () => {
    console.log('Connection restored');
    connectionStatus = 'online';
    
    // Notify all clients
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({ type: 'connection-status', status: 'online' });
        });
    });
});

self.addEventListener('offline', () => {
    console.log('Connection lost');
    connectionStatus = 'offline';
    
    // Notify all clients
    self.clients.matchAll().then(clients => {
        clients.forEach(client => {
            client.postMessage({ type: 'connection-status', status: 'offline' });
        });
    });
});

// Utility functions for Nigerian network optimizations
const NetworkOptimizer = {
    // Detect connection speed
    async detectConnectionSpeed() {
        try {
            const startTime = performance.now();
            await fetch('/api/health', { method: 'HEAD' });
            const endTime = performance.now();
            
            const latency = endTime - startTime;
            
            if (latency < 100) return 'fast';
            if (latency < 500) return 'medium';
            return 'slow';
        } catch (error) {
            return 'offline';
        }
    },
    
    // Compress image for slow connections
    async compressImage(file, quality = 0.8) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    },
    
    // Retry with exponential backoff
    async retryWithBackoff(fn, maxAttempts = 3, baseDelay = 1000) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxAttempts) throw error;
                
                const delay = baseDelay * Math.pow(2, attempt - 1);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
};

// Export for use in main thread
self.NetworkOptimizer = NetworkOptimizer;
