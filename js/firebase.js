// ============================================================
// Firebase loader — dimuat dinamis HANYA jika FIREBASE_CONFIG diisi,
// sehingga aplikasi tetap ringan saat dibuka (tanpa SDK bila mode demo).
// ============================================================
import { FIREBASE_CONFIG, isFirebaseConfigured } from "./config.js";

const V = "10.13.1";
const base = `https://www.gstatic.com/firebasejs/${V}`;

let _app = null, _db = null, _auth = null, _mod = {};
let _authMod = null;
let _ready = null;

export const enabled = () => isFirebaseConfigured();

async function load() {
  if (_ready) return _ready;
  _ready = (async () => {
    const [appMod, fsMod, authMod] = await Promise.all([
      import(`${base}/firebase-app.js`),
      import(`${base}/firebase-firestore.js`),
      import(`${base}/firebase-auth.js`),
    ]);
    _mod = fsMod;
    _authMod = authMod;
    _app = appMod.initializeApp(FIREBASE_CONFIG);
    _db = fsMod.getFirestore(_app);
    _auth = authMod.getAuth(_app);
    return true;
  })().catch((e) => {
    console.error("Firebase gagal dimuat:", e);
    _ready = null;
    return false;
  });
  return _ready;
}

export async function init() {
  if (!isFirebaseConfigured()) return false;
  return load();
}

export function db() { return _db; }

// ---- CRUD ----
export async function fsAdd(coll, data) {
  const { addDoc, collection } = _mod;
  return (await addDoc(collection(_db, coll), data)).id;
}
export async function fsSet(coll, id, data) {
  const { doc, setDoc } = _mod;
  return setDoc(doc(_db, coll, id), data, { merge: true });
}
export async function fsUpdate(coll, id, patch) {
  const { doc, updateDoc } = _mod;
  return updateDoc(doc(_db, coll, id), patch);
}
export async function fsDelete(coll, id) {
  const { doc, deleteDoc } = _mod;
  return deleteDoc(doc(_db, coll, id));
}
export async function fsQuery(coll, filters = [], limitN = 500) {
  const { collection, query, where, getDocs, limit } = _mod;
  const parts = [collection(_db, coll)];
  for (const [f, op, v] of filters) parts.push(where(f, op, v));
  const snap = await getDocs(query(...parts, limit(limitN)));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---- Realtime ----
export function fsSubscribe(coll, onChange) {
  const { collection, onSnapshot } = _mod;
  return onSnapshot(collection(_db, coll), (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  }, (err) => console.warn("onSnapshot:", coll, err.code || err.message));
}

// onSnapshot dengan filter where (dipakai chat per tim)
export function fsSubscribeQ(coll, filters, onChange) {
  const { collection, query, where, onSnapshot, orderBy, limit } = _mod;
  const parts = [collection(_db, coll)];
  for (const [f, op, v] of filters) parts.push(where(f, op, v));
  return onSnapshot(query(...parts, orderBy("at", "asc"), limit(300)),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (err) => console.warn("onSnapshotQ:", coll, err.code || err.message));
}

export function currentUid() {
  return _auth?.currentUser?.uid || null;
}

// ---- Auth (login) ----
export function onAuthChange(cb) {
  return _authMod.onAuthStateChanged(_auth, (u) => cb(u ? {
    uid: u.uid, email: u.email || "", isAnonymous: u.isAnonymous,
  } : null));
}
export async function signInEmail(email, pass) {
  await _authMod.signInWithEmailAndPassword(_auth, email, pass);
}
export async function signUpEmail(email, pass) {
  await _authMod.createUserWithEmailAndPassword(_auth, email, pass);
}
export async function signInGuest() {
  await _authMod.signInAnonymously(_auth);
}
export async function signOutUser() {
  await _authMod.signOut(_auth);
}
export async function fsGet(coll, id) {
  const { doc, getDoc } = _mod;
  const s = await getDoc(doc(_db, coll, id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}
