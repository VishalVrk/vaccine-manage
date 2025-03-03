import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyDxES9HBIjZ7bP38k9OBFA_H2VELozCLGQ",
    authDomain: "vaccine-management-ebad8.firebaseapp.com",
    projectId: "vaccine-management-ebad8",
    storageBucket: "vaccine-management-ebad8.firebasestorage.app",
    messagingSenderId: "278100911062",
    appId: "1:278100911062:web:802f9f3edcff55dbc8ba77"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);