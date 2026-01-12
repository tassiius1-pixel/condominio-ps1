
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, updateDoc } from "firebase/firestore";

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

async function correctVote() {
    const votingId = "hzi1Oa9EexnUOpBuXu9W";
    const newUserId = "mjr2cihgs8QnJB52QXdR"; // Tania Juliani
    const newUserName = "TANIA JULIANI";
    const newHouseNumber = 16;
    const voteIndex = 20;

    console.log(`Updating voting ${votingId} at index ${voteIndex}...`);

    const votingRef = doc(db, "votings", votingId);
    const votingSnap = await getDoc(votingRef);

    if (!votingSnap.exists()) {
        console.error("Voting not found!");
        process.exit(1);
    }

    const data = votingSnap.data();
    if (!data.votes || !data.votes[voteIndex]) {
        console.error("Vote not found at index!");
        process.exit(1);
    }

    const oldVote = data.votes[voteIndex];
    console.log("Found old vote:", oldVote);

    const updatedVotes = [...data.votes];
    updatedVotes[voteIndex] = {
        ...oldVote,
        userId: newUserId,
        userName: newUserName,
        houseNumber: newHouseNumber,
        timestamp: oldVote.timestamp // Keep original time
    };

    await updateDoc(votingRef, { votes: updatedVotes });

    console.log("Vote updated successfully!");
    process.exit(0);
}

correctVote().catch((err) => {
    console.error(err);
    process.exit(1);
});
