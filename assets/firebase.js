import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
import { firebaseConfig } from "/assets/firebase-config.js";

export const configured = !String(firebaseConfig.apiKey).startsWith("YOUR_");
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
