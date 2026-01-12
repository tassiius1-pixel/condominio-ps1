
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

import fs from 'fs';
async function listData() {
    const results = { users: [], votings: [] };

    const usersCol = collection(db, "users");
    const userSnapshot = await getDocs(usersCol);
    userSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.name.toUpperCase().includes("TANIA") || data.houseNumber === 16 || data.houseNumber === 94) {
            results.users.push({ id: doc.id, name: data.name, house: data.houseNumber });
        }
    });

    const votingsCol = collection(db, "votings");
    const votingSnapshot = await getDocs(votingsCol);
    votingSnapshot.forEach((doc) => {
        const data = doc.data();
        const votingInfo = { id: doc.id, title: data.title, relevantVotes: [] };
        if (data.votes) {
            data.votes.forEach((vote, index) => {
                if (vote.userName.toUpperCase().includes("TANIA") || vote.houseNumber === 16 || vote.houseNumber === 94) {
                    votingInfo.relevantVotes.push({ index, userName: vote.userName, house: vote.houseNumber, userId: vote.userId });
                }
            });
        }
        if (votingInfo.relevantVotes.length > 0) {
            results.votings.push(votingInfo);
        }
    });

    fs.writeFileSync('clean_results.json', JSON.stringify(results, null, 2), 'utf8');
    console.log("SAVED_TO_FILE");
    process.exit(0);
}

listData().catch((err) => {
    console.error(err);
    process.exit(1);
});
