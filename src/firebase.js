import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

// 👇 Cole aqui as chaves do SEU projeto Firebase (veja o passo a passo)
const firebaseConfig = {
  apiKey: "AIzaSyDB8qpigEqohDOjWL7yuEA-rmFZG4mL6PQ",
  authDomain: "pelada-ccb.firebaseapp.com",
  projectId: "pelada-ccb",
  storageBucket: "pelada-ccb.firebasestorage.app",
  messagingSenderId: "681770009710",
  appId: "1:681770009710:web:bc85c3dc010fa2df9bd27f"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

const COLLECTION = 'peladaApp';

export async function cloudGet(key) {
  try {
    const snap = await getDoc(doc(db, COLLECTION, key));
    return snap.exists() ? snap.data().value : null;
  } catch (e) {
    console.error('cloudGet error', e);
    return null;
  }
}

export async function cloudSet(key, value) {
  try {
    await setDoc(doc(db, COLLECTION, key), { value });
    return true;
  } catch (e) {
    console.error('cloudSet error', e);
    return false;
  }
}

export function localGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

export function localSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}
