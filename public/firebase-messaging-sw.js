importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyBzyw5jCedD4_Z6j1cA3gQ--ZStGydM2Xk",
  authDomain: "climo-ac171.firebaseapp.com",
  projectId: "climo-ac171",
  storageBucket: "climo-ac171.firebasestorage.app",
  messagingSenderId: "426884097485",
  appId: "1:426884097485:web:2af4dc33a80f6f5e24d084",
  measurementId: "G-LC8N2Q5936",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("백그라운드 메시지 수신:", payload);

  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icon.png",
  });
});
