
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, query, limit } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyBlhc0D_5SUQMZsp-7M-mxvGHQ_IkZHXww",
    authDomain: "manutencao-condominio-ps1.firebaseapp.com",
    projectId: "manutencao-condominio-ps1",
    storageBucket: "manutencao-condominio-ps1.appspot.com",
    messagingSenderId: "581878893480",
    appId: "1:581878893480:web:fe0f06205e1c5e8e5aeb9d",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkRequests() {
    const q = query(collection(db, "requests"), limit(5));
    const snap = await getDocs(q);
    const results = [];
    snap.forEach(doc => {
        const data = doc.data();
        results.push({
            id: doc.id,
            title: data.title,
            authorId: data.authorId,
            authorName: data.authorName
        });
    });
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
}

checkRequests().catch(console.error);
