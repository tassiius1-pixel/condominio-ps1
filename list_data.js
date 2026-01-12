import { db } from './services/firebase.js';
import { collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

async function listData() {
    console.log("Starting data extraction...");
    const usersSnap = await getDocs(collection(db, "users"));
    const users = [];
    usersSnap.forEach(doc => {
        const d = doc.data();
        users.push({
            id: doc.id,
            name: d.name,
            house: d.houseNumber,
            fcmToken: d.fcmToken ? d.fcmToken.substring(0, 15) + '...' : null,
            fcmTokensCount: d.fcmTokens ? d.fcmTokens.length : 0,
            lastSync: d.lastTokenSync,
            pushEnabled: d.pushEnabled
        });
    });

    const votingsSnap = await getDocs(collection(db, "votings"));
    const votings = [];
    votingsSnap.forEach(doc => {
        const d = doc.data();
        votings.push({
            id: doc.id,
            title: d.title,
            votesCount: d.votes ? d.votes.length : 0
        });
    });

    const out = { users, votings };
    fs.writeFileSync('tokens_check.json', JSON.stringify(out, null, 2));
    console.log("Tokens check saved to tokens_check.json");
    process.exit(0);
}

listData().catch(err => {
    console.error(err);
    process.exit(1);
});
