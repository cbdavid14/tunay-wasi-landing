// public/firebase-messaging-sw.js
// Service Worker para Firebase Cloud Messaging (push en background)

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// Config hardcodeada — el SW no puede leer variables de entorno de Vite
firebase.initializeApp({
  apiKey: 'AIzaSyAYg6kDUAyhp07Lhzfqry3XlXWMUhUoLEo',
  authDomain: 'alpaso-app.firebaseapp.com',
  projectId: 'alpaso-app',
  storageBucket: 'alpaso-app.firebasestorage.app',
  messagingSenderId: '695322169139',
  appId: '1:695322169139:web:31d707744410cdb743f846',
});

const messaging = firebase.messaging();

// Recibir push cuando la app está en background o cerrada
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification ?? {};
  self.registration.showNotification(title ?? 'Tunay Wasi', {
    body: body ?? '',
    icon: icon ?? '/imgs/logo.png',
    badge: '/imgs/logo.png',
    data: payload.data ?? {},
  });
});

// Click en la notificación → abrir la app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
