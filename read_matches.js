const { initializeApp } = require("firebase/app");
const { getFirestore, collection, getDocs } = require("firebase/firestore");

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCxxQUxtEImclVGMWF1FZ84p-0XM9-OGPk",
  authDomain:        "zeta-sports.firebaseapp.com",
  projectId:         "zeta-sports",
  storageBucket:     "zeta-sports.firebasestorage.app",
  messagingSenderId: "500544502674",
  appId:             "1:500544502674:web:d0f19312ef703352b41f4b",
  measurementId:     "G-LY4EQXYFWG"
};

const app = initializeApp(FIREBASE_CONFIG);
const db = getFirestore(app);

async function checkMatches() {
  try {
    const querySnapshot = await getDocs(collection(db, "matches"));
    querySnapshot.forEach((doc) => {
      console.log(doc.id, " => ", doc.data());
    });
  } catch (e) {
    console.error("Error reading: ", e);
  }
}

checkMatches();
