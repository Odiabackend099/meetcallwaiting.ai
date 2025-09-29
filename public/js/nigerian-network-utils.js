/**
 * Nigerian Network Optimization Utilities
 * Handles slow connections, offline support, and retry logic
 */

class NigerianNetworkOptimizer {
    constructor() {
        this.connectionSpeed = 'unknown';
        this.isOnline = navigator.onLine;
        this.retryQueue = [];
        this.maxRetries = 3;
        this.baseDelay = 1000;
        
        this.init();
    }

    init() {
        // Monitor connection status
        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
        
        // Detect connection speed
        this.detectConnectionSpeed();
        
        // Register service worker
        this.registerServiceWorker();
        
        // Start retry queue processor
        this.startRetryQueue();
    }

    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered:', registration);
                
                // Listen for service worker messages
                navigator.serviceWorker.addEventListener('message', (event) => {
                    this.handleServiceWorkerMessage(event.data);
                });
                
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }

    async detectConnectionSpeed() {
        try {
            const startTime = performance.now();
            
            // Test with a lightweight endpoint
            await fetch('/api/health', { 
                method: 'HEAD',
                cache: 'no-cache'
            });
            
            const endTime = performance.now();
            const latency = endTime - startTime;
            
            if (latency < 100) {
                this.connectionSpeed = 'fast';
            } else if (latency < 500) {
                this.connectionSpeed = 'medium';
            } else {
                this.connectionSpeed = 'slow';
            }
            
            console.log(`Connection speed detected: ${this.connectionSpeed} (${latency.toFixed(2)}ms)`);
            
            // Adjust settings based on connection speed
            this.adjustForConnectionSpeed();
            
        } catch (error) {
            this.connectionSpeed = 'offline';
            console.log('Connection speed: offline');
        }
    }

    adjustForConnectionSpeed() {
        switch (this.connectionSpeed) {
            case 'slow':
                this.maxRetries = 5;
                this.baseDelay = 2000;
                this.enableSkeletonScreens();
                this.enableLazyLoading();
                break;
            case 'medium':
                this.maxRetries = 3;
                this.baseDelay = 1000;
                this.enableLazyLoading();
                break;
            case 'fast':
                this.maxRetries = 2;
                this.baseDelay = 500;
                break;
        }
    }

    enableSkeletonScreens() {
        // Add skeleton loading for slow connections
        document.querySelectorAll('[data-skeleton]').forEach(element => {
            element.classList.add('skeleton-loading');
        });
    }

    enableLazyLoading() {
        // Enable lazy loading for images and components
        if ('IntersectionObserver' in window) {
            const lazyImages = document.querySelectorAll('img[data-src]');
            
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.classList.remove('lazy');
                        observer.unobserve(img);
                    }
                });
            });
            
            lazyImages.forEach(img => imageObserver.observe(img));
        }
    }

    async retryWithBackoff(fn, context = 'unknown') {
        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                const result = await fn();
                console.log(`Operation succeeded on attempt ${attempt} (${context})`);
                return result;
            } catch (error) {
                console.warn(`Attempt ${attempt} failed (${context}):`, error.message);
                
                if (attempt === this.maxRetries) {
                    console.error(`All ${this.maxRetries} attempts failed (${context})`);
                    throw error;
                }
                
                // Exponential backoff with jitter
                const delay = this.baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
                console.log(`Retrying in ${delay.toFixed(0)}ms...`);
                
                await this.sleep(delay);
            }
        }
    }

    async queueOfflineAction(action, context = 'unknown') {
        if (this.isOnline) {
            try {
                return await action();
            } catch (error) {
                console.warn(`Action failed, queuing for retry (${context}):`, error.message);
                this.retryQueue.push({ action, context, timestamp: Date.now() });
                throw error;
            }
        } else {
            console.log(`Offline, queuing action for later (${context})`);
            this.retryQueue.push({ action, context, timestamp: Date.now() });
            
            // Show offline notification
            this.showOfflineNotification();
            throw new Error('Offline - action queued for retry');
        }
    }

    startRetryQueue() {
        setInterval(() => {
            if (this.isOnline && this.retryQueue.length > 0) {
                this.processRetryQueue();
            }
        }, 5000); // Check every 5 seconds
    }

    async processRetryQueue() {
        const queue = [...this.retryQueue];
        this.retryQueue = [];
        
        console.log(`Processing ${queue.length} queued actions`);
        
        for (const { action, context } of queue) {
            try {
                await action();
                console.log(`Queued action succeeded: ${context}`);
            } catch (error) {
                console.error(`Queued action failed: ${context}`, error);
                // Re-queue if still failing
                this.retryQueue.push({ action, context, timestamp: Date.now() });
            }
        }
    }

    handleOnline() {
        this.isOnline = true;
        console.log('Connection restored');
        
        // Remove offline indicators
        this.hideOfflineNotification();
        
        // Re-detect connection speed
        this.detectConnectionSpeed();
        
        // Trigger sync
        this.triggerBackgroundSync();
    }

    handleOffline() {
        this.isOnline = false;
        console.log('Connection lost');
        
        // Show offline indicators
        this.showOfflineNotification();
        
        // Disable real-time features
        this.disableRealTimeFeatures();
    }

    handleServiceWorkerMessage(data) {
        switch (data.type) {
            case 'connection-status':
                if (data.status === 'online') {
                    this.handleOnline();
                } else {
                    this.handleOffline();
                }
                break;
        }
    }

    showOfflineNotification() {
        // Create or show offline notification
        let notification = document.getElementById('offline-notification');
        
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'offline-notification';
            notification.className = 'offline-notification';
            notification.innerHTML = `
                <div class="offline-content">
                    <span class="offline-icon">📡</span>
                    <span class="offline-text">You're offline. Changes will sync when connected.</span>
                    <button class="offline-retry-btn" onclick="networkOptimizer.retryQueueNow()">Retry Now</button>
                </div>
            `;
            
            document.body.appendChild(notification);
        }
        
        notification.style.display = 'block';
    }

    hideOfflineNotification() {
        const notification = document.getElementById('offline-notification');
        if (notification) {
            notification.style.display = 'none';
        }
    }

    async retryQueueNow() {
        if (this.retryQueue.length > 0) {
            await this.processRetryQueue();
        }
    }

    disableRealTimeFeatures() {
        // Disable features that require real-time connection
        document.querySelectorAll('[data-realtime]').forEach(element => {
            element.disabled = true;
            element.classList.add('offline-disabled');
        });
    }

    enableRealTimeFeatures() {
        // Re-enable real-time features
        document.querySelectorAll('[data-realtime]').forEach(element => {
            element.disabled = false;
            element.classList.remove('offline-disabled');
        });
    }

    triggerBackgroundSync() {
        if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
            navigator.serviceWorker.ready.then(registration => {
                registration.sync.register('chat-message');
                registration.sync.register('dashboard-data');
            });
        }
    }

    // Utility function to sleep
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Compress image for slow connections
    async compressImage(file, quality = 0.8) {
        if (this.connectionSpeed === 'fast') {
            return file; // No compression needed for fast connections
        }

        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            img.onload = () => {
                // Calculate new dimensions for slow connections
                let { width, height } = img;
                
                if (this.connectionSpeed === 'slow' && width > 800) {
                    height = (height * 800) / width;
                    width = 800;
                }
                
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(resolve, 'image/jpeg', quality);
            };
            
            img.src = URL.createObjectURL(file);
        });
    }

    // Optimize API calls for Nigerian networks
    async optimizedFetch(url, options = {}) {
        const defaultOptions = {
            timeout: this.connectionSpeed === 'slow' ? 30000 : 10000,
            retries: this.maxRetries,
            ...options
        };

        return this.retryWithBackoff(async () => {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), defaultOptions.timeout);

            try {
                const response = await fetch(url, {
                    ...defaultOptions,
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                return response;
            } catch (error) {
                clearTimeout(timeoutId);
                throw error;
            }
        }, `fetch-${url}`);
    }

    // Get connection info
    getConnectionInfo() {
        return {
            isOnline: this.isOnline,
            connectionSpeed: this.connectionSpeed,
            queuedActions: this.retryQueue.length,
            maxRetries: this.maxRetries,
            baseDelay: this.baseDelay
        };
    }
}

// Initialize the network optimizer
const networkOptimizer = new NigerianNetworkOptimizer();

// Export for use in other scripts
window.NigerianNetworkOptimizer = NigerianNetworkOptimizer;
window.networkOptimizer = networkOptimizer;
