import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyBzyw5jCedD4_Z6j1cA3gQ--ZStGydM2Xk",
  authDomain: "climo-ac171.firebaseapp.com",
  projectId: "climo-ac171",
  storageBucket: "climo-ac171.firebasestorage.app",
  messagingSenderId: "426884097485",
  appId: "1:426884097485:web:2af4dc33a80f6f5e24d084",
  measurementId: "G-LC8N2Q5936",
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestFcmToken = async () => {
  try {
    console.log("알림 권한 요청 시작");

    const permission = await Notification.requestPermission();
    console.log("permission:", permission);

    if (permission !== "granted") {
      return null;
    }

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js",
    );

    console.log("서비스워커 등록 완료:", registration);

    const token = await getToken(messaging, {
      vapidKey:
        "BO8pGaY-2Z6f-dog4hHTd9ta2F7rsJor5Q0G4whoyow4sWZ1qZ8aO69LPnlxPPmUEWloIgeAdMOG7gw4jfuSTLw",
      serviceWorkerRegistration: registration,
    });

    console.log("FCM TOKEN:", token);

    return token;
  } catch (error) {
    console.error("FCM 토큰 발급 실패:", error);
    return null;
  }
};
