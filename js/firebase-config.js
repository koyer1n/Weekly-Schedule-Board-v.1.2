/**
 * Firebase configuration and initialization
 */

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyA9kO9d5wA2LKxdh6we6y1gM0-LuDKcVZ8",
    authDomain: "weekly-schedule-board.firebaseapp.com",
    databaseURL: "https://weekly-schedule-board-default-rtdb.firebaseio.com",
    projectId: "weekly-schedule-board",
    storageBucket: "weekly-schedule-board.appspot.com",
    messagingSenderId: "518722521976",
    appId: "1:518722521976:web:0cc9e0ea5d346bc014568d",
    measurementId: "G-3CWB6TXY4G"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();
console.log("Firebase initialized:", db);
