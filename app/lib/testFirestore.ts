import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function testWrite(uid: string) {
  await addDoc(collection(db, "test"), {
    uid,
    createdAt: serverTimestamp(),
  });
}
