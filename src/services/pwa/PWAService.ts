export class PWAService {
    private static instance: PWAService;
    private deferredPrompt: any = null;
    private isInstalled: boolean = false;
    private pushSubscription: PushSubscription | null = null;
    
    private constructor() {
      this.checkIfInstalled();
      this.setupInstallPrompt();
    }
    
    public static getInstance(): PWAService {
      if (!PWAService.instance) {
        PWAService.instance = new PWAService();
      }
      return PWAService.instance;
    }
    
    private checkIfInstalled(): void {
      // Check if app is installed
      if (window.matchMedia('(display-mode: standalone)').matches) {
        this.isInstalled = true;
      }
      
      // Check iOS
      if ((window.navigator as any).standalone) {
        this.isInstalled = true;
      }
    }
    
    private setupInstallPrompt(): void {
      window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        this.deferredPrompt = e;
        this.notifyInstallReady();
      });
      
      window.addEventListener('appinstalled', () => {
        this.isInstalled = true;
        this.deferredPrompt = null;
      });
    }
    
    public canInstall(): boolean {
      return !this.isInstalled && this.deferredPrompt !== null;
    }
    
    public async install(): Promise<boolean> {
      if (!this.deferredPrompt) {
        return false;
      }
      
      this.deferredPrompt.prompt();
      const { outcome } = await this.deferredPrompt.userChoice;
      
      this.deferredPrompt = null;
      
      if (outcome === 'accepted') {
        this.isInstalled = true;
        return true;
      }
      
      return false;
    }
    
    public async registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/service-worker.js');
          console.log('Service Worker registered:', registration);
          return registration;
        } catch (error) {
          console.error('Service Worker registration failed:', error);
          return null;
        }
      }
      return null;
    }
    
    public async subscribeToPush(): Promise<PushSubscription | null> {
      const registration = await navigator.serviceWorker.ready;
      
      try {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(
            process.env.REACT_APP_VAPID_PUBLIC_KEY || ''
          )
        });
        
        this.pushSubscription = subscription;
        
        // Send subscription to server
        await this.sendSubscriptionToServer(subscription);
        
        return subscription;
      } catch (error) {
        console.error('Failed to subscribe to push:', error);
        return null;
      }
    }
    
    private async sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
      // In futuro invierà a Supabase
      console.log('Push subscription:', subscription);
      localStorage.setItem('pushSubscription', JSON.stringify(subscription));
    }
    
    private urlBase64ToUint8Array(base64String: string): Uint8Array {
      const padding = '='.repeat((4 - base64String.length % 4) % 4);
      const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
      
      const rawData = window.atob(base64);
      const outputArray = new Uint8Array(rawData.length);
      
      for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
      }
      
      return outputArray;
    }
    
    public async checkNotificationPermission(): Promise<NotificationPermission> {
      if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return 'denied';
      }
      
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        return permission;
      }
      
      return Notification.permission;
    }
    
    // Observable per notificare quando l'app è installabile
    private installReadyCallbacks: Set<() => void> = new Set();
    
    public onInstallReady(callback: () => void): () => void {
      this.installReadyCallbacks.add(callback);
      return () => this.installReadyCallbacks.delete(callback);
    }
    
    private notifyInstallReady(): void {
      this.installReadyCallbacks.forEach(callback => callback());
    }
  }
  
  export const pwaService = PWAService.getInstance();