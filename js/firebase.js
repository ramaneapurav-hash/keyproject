// ============================================================
//  KEY PROJECT ARCHITECTURE — firebase.js
//  Full Firebase integration: Auth, Firestore, Storage
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, setDoc, getDoc, onSnapshot, orderBy, query, updateDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCuWeZCuH-SGNKK7YDynUruvy2s1n3SbyQ",
  authDomain: "keyproject-adb32.firebaseapp.com",
  projectId: "keyproject-adb32",
  storageBucket: "keyproject-adb32.firebasestorage.app",
  messagingSenderId: "938805853774",
  appId: "1:938805853774:web:50ca6be7ada98e772d8d1f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Expose to window for use in main.js and admin.js
window._auth = auth;
window._db = db;
window._signIn = signInWithEmailAndPassword;
window._signOut = signOut;
window._onAuthStateChanged = onAuthStateChanged;
window._collection = collection;
window._addDoc = addDoc;
window._getDocs = getDocs;
window._deleteDoc = deleteDoc;
window._doc = doc;
window._setDoc = setDoc;
window._getDoc = getDoc;
window._onSnapshot = onSnapshot;
window._query = query;
window._orderBy = orderBy;
window._updateDoc = updateDoc;

// Auth state listener
onAuthStateChanged(auth, (user) => {
  window._currentUser = user;
  if (user && window._onAuthReady) window._onAuthReady(user);
});

// ============================================================
//  MESSAGES
// ============================================================
export async function fbSaveMessage(entry) {
  if (!db) return;
  try {
    await addDoc(collection(db, 'messages'), { ...entry, timestamp: Date.now(), read: false });
  } catch (e) { console.log('Firebase save message error:', e); }
}

export async function fbDeleteMessage(id) {
  if (!db) return;
  try { await deleteDoc(doc(db, 'messages', id)); }
  catch (e) { console.log('Firebase delete message error:', e); }
}

export function fbListenMessages(callback) {
  if (!db) return;
  try {
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(msgs);
    });
  } catch (e) { console.log('Firebase listen messages error:', e); }
}

// ============================================================
//  PROJECTS
// ============================================================
export async function fbSaveProject(project) {
  if (!db) return null;
  try {
    if (project.fbId) {
      await setDoc(doc(db, 'projects', project.fbId), project);
      return project.fbId;
    } else {
      const ref = await addDoc(collection(db, 'projects'), project);
      return ref.id;
    }
  } catch (e) { console.log('Firebase save project error:', e); return null; }
}

export async function fbDeleteProject(fbId) {
  if (!db || !fbId) return;
  try { await deleteDoc(doc(db, 'projects', fbId)); }
  catch (e) { console.log('Firebase delete project error:', e); }
}

export async function fbLoadProjects() {
  if (!db) return [];
  try {
    const snap = await getDocs(collection(db, 'projects'));
    return snap.docs.map(d => ({ fbId: d.id, ...d.data() }));
  } catch (e) { console.log('Firebase load projects error:', e); return []; }
}

// ============================================================
//  CLIENTS / BRANDS
// ============================================================
export async function fbSaveBrands(clients) {
  if (!db) return;
  try { await setDoc(doc(db, 'settings', 'clients'), { data: clients }); }
  catch (e) { console.log('Firebase save brands error:', e); }
}

export async function fbLoadBrands() {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'settings', 'clients'));
    return snap.exists() ? snap.data().data : null;
  } catch (e) { console.log('Firebase load brands error:', e); return null; }
}

// ============================================================
//  SITE SETTINGS
// ============================================================
export async function fbSaveSettings(settings) {
  if (!db) return;
  try { await setDoc(doc(db, 'settings', 'site'), settings); }
  catch (e) { console.log('Firebase save settings error:', e); }
}

export async function fbLoadSettings() {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, 'settings', 'site'));
    return snap.exists() ? snap.data() : null;
  } catch (e) { console.log('Firebase load settings error:', e); return null; }
}
