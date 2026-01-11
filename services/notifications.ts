
interface NotificationOptions {
    body?: string;
    icon?: string;
    tag?: string; // Use tag to prevent duplicate notifications
}

class NotificationService {
    private permission: NotificationPermission = 'default';

    constructor() {
        if ('Notification' in window) {
            this.permission = Notification.permission;
        }
    }

    // Request permission from the user
    async requestPermission(): Promise<boolean> {
        if (!('Notification' in window)) {
            console.log("This browser does not support desktop notification");
            return false;
        }

        try {
            const result = await Notification.requestPermission();
            this.permission = result;
            return result === 'granted';
        } catch (error) {
            console.error("Error requesting notification permission:", error);
            return false;
        }
    }

    // Send a notification
    send(title: string, body?: string, tag?: string) {
        if (this.permission === 'granted') {
            try {
                // Try to use Service Worker registration if available (better for mobile)
                if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                    navigator.serviceWorker.ready.then(registration => {
                        registration.showNotification(title, {
                            body,
                            icon: '/pwa-192x192.png',
                            vibrate: [200, 100, 200],
                            tag
                        });
                    });
                } else {
                    // Fallback to standard API
                    const options: NotificationOptions = {
                        body,
                        icon: '/pwa-192x192.png',
                        tag
                    };
                    new Notification(title, options);
                }
            } catch (e) {
                console.error("Notification trigger failed", e);
            }
        }
    }

    get hasPermission() {
        return this.permission === 'granted';
    }
}

export const notificationService = new NotificationService();
