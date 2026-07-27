import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyAwKltLAuIin_y5-EOVfa8Dz9vskSaWZyg",
  authDomain: "erlkimplayer.firebaseapp.com",
  databaseURL: "https://erlkimplayer-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "erlkimplayer",
  storageBucket: "erlkimplayer.firebasestorage.app",
  messagingSenderId: "935165475751",
  appId: "1:935165475751:android:b860b0e337b0856ea11482" // Note: This is the Android App ID, consider adding a Web App in Firebase Console later
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const database = getDatabase(app);
