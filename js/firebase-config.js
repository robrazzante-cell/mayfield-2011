const firebaseConfig = {
    apiKey: "AIzaSyAWaCRLNBhqK5S2KJXc3rHi3Dwai9IlLyI",
    authDomain: "mayfield-2011.firebaseapp.com",
    projectId: "mayfield-2011",
    storageBucket: "mayfield-2011.firebasestorage.app",
    messagingSenderId: "810896057198",
    appId: "1:810896057198:web:9a20b6902b47ff8e29177f",
    measurementId: "G-KGQ37LFHF2"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const googleProvider = new firebase.auth.GoogleAuthProvider();
