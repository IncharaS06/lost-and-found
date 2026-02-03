import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyAO5xXd3NKoM-i5PADj1OEYnDJxeKT8CGc",
    authDomain: "lost-and-found-ef176.firebaseapp.com",
    projectId: "lost-and-found-ef176",

    // ✅ MUST be appspot.com (NOT firebasestorage.app)
    storageBucket: "lost-and-found-ef176.appspot.com",

    messagingSenderId: "262037355163",
    appId: "1:262037355163:web:903ac6f68cdc9de1f2243e",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
