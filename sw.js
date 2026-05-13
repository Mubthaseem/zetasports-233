// ============================================================
//  ZETASPORTS — Firebase Messaging Service Worker (sw.js)
//  Must be served over HTTPS for push notifications to work.
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize Firebase in SW (same config as app)
firebase.initializeApp({
  apiKey:            "AIzaSyCxxQUxtEImclVGMWF1FZ84p-0XM9-OGPk",
  authDomain:        "zeta-sports.firebaseapp.com",
  projectId:         "zeta-sports",
  storageBucket:     "zeta-sports.firebasestorage.app",
  messagingSenderId: "500544502674",
  appId:             "1:500544502674:web:d0f19312ef703352b41f4b"
});

const messaging = firebase.messaging();

// Handle background push notifications
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification;
  self.registration.showNotification(title || 'ZETASPORTS', {
    body: body || 'A match is live on ZETASPORTS!',
    icon: icon || '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'zetasports-alert',
    renotify: true,
    data: payload.data || {}
  });
});

// Notification click → open app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) {
        return clientList[0].focus();
      }
      return clients.openWindow('/');
    })
  );
});
