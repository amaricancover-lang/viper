// Firebase কনসোল → Project settings → General → Your apps → Web app (</>) থেকে এই মানগুলো কপি করে বসান।
// এই কনফিগ গোপন নয় (ওয়েবে এমনিতেই দেখা যায়); নিরাপত্তা নিশ্চিত করে firestore.rules।
export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
