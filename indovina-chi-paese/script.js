import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getDatabase, ref, set, get, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { characters } from "./data.js";

/* FIREBASE CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyBPnyKoJ3TAFnff4VjHuAe48Z7395dQo0s",
  authDomain: "indovina-chi-palmi-edition.firebaseapp.com",
  databaseURL: "https://indovina-chi-palmi-edition-default-rtdb.firebaseio.com",
  projectId: "indovina-chi-palmi-edition",
  storageBucket: "indovina-chi-palmi-edition.firebasestorage.app",
  messagingSenderId: "469308668808",
  appId: "1:469308668808:web:fe501b77765fc5bb76983d"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const storage = getStorage(app);

/* ELEMENTI DOM */
const siteGate = document.getElementById("siteGate");
const sitePassword = document.getElementById("sitePassword");
const siteAccessBtn = document.getElementById("siteAccessBtn");

const loginScreen = document.getElementById("loginScreen");
const nicknameInput = document.getElementById("nicknameInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");

const gameScreen = document.getElementById("gameScreen");
const playersList = document.getElementById("playersList");
const board = document.getElementById("board");
const roomInput = document.getElementById("roomInput");
const joinBtn = document.getElementById("joinBtn");
const startBtn = document.getElementById("startBtn");

const adminPanel = document.getElementById("adminPanel");
const adminActionSelect = document.getElementById("adminActionSelect");
const adminUsersSection = document.getElementById("adminUsersSection");
const adminCharactersSection = document.getElementById("adminCharactersSection");
const adminRoomsSection = document.getElementById("adminRoomsSection");
const usersList = document.getElementById("usersList");
const characterList = document.getElementById("characterList");
const roomsList = document.getElementById("roomsList");
const charFileInput = document.getElementById("charFileInput");
const addCharBtn = document.getElementById("addCharBtn");

const logoutBtn = document.getElementById("logoutBtn");
const mainNavbar = document.getElementById("mainNavbar");
const bgMusic = document.getElementById("bgMusic");

/* VARIABILI */
let currentUser = null;
let roomCode = null;
let isAdmin = false;

/* ============================
   PASSWORD GENERALE
============================ */
siteAccessBtn.onclick = () => {
  if(sitePassword.value.trim() === "PALMARIGGI123"){
    siteGate.classList.add("hidden");
    loginScreen.classList.remove("hidden");
    bgMusic.volume = 0.4;
    bgMusic.play().catch(()=>{});
  } else {
    alert("Password errata");
  }
};

/* ============================
   LOGIN / REGISTRAZIONE
============================ */
loginBtn.onclick = async () => {
  const nickname = nicknameInput.value.trim();
  const password = passwordInput.value.trim();
  if(!nickname) return;

  const snap = await get(ref(db, `users/${nickname}`));
  const user = snap.val();

  if(user){
    if(user.role === "admin"){
      if(user.password !== password){
        alert("Password admin errata");
        return;
      }
      isAdmin = true;
      currentUser = nickname;
      loginScreen.classList.add("hidden");
      adminPanel.classList.remove("hidden");
      mainNavbar.classList.remove("hidden");
      return;
    }
    if(user.status !== "approved"){
      alert("Attendi approvazione admin");
      return;
    }
    currentUser = nickname;
    loginScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    mainNavbar.classList.remove("hidden");
  } else {
    await set(ref(db, `users/${nickname}`), {
      nickname,
      role: "user",
      status: "pending"
    });
    alert("Registrato. Attendi approvazione");
  }
};

/* ============================
   JOIN ROOM / LOBBY
============================ */
joinBtn.onclick = async () => {
  roomCode = roomInput.value.trim().toUpperCase();
  if(!roomCode) return;

  await set(ref(db, `rooms/${roomCode}/players/${currentUser}`), {
    nickname: currentUser,
    characterId: null
  });
  await update(ref(db, `rooms/${roomCode}`), { status: "waiting" });

  listenRoom();
};

/* ============================
   LISTENER ROOM REALTIME
============================ */
function listenRoom(){
  onValue(ref(db, `rooms/${roomCode}`), snap => {
    const room = snap.val();
    if(!room) return;

    const players = room.players || {};
    const status = room.status || "waiting";

    renderPlayers(players, status);
    renderBoard();
    startBtn.style.display = (status === "active") ? "none" : "block";
  });
}

/* ============================
   START GAME
============================ */
startBtn.onclick = async () => {
  if(!roomCode) return;

  startBtn.style.display = "none"; // scompare subito

  const snap = await get(ref(db, `rooms/${roomCode}/players`));
  const players = snap.val();
  if(!players){
    alert("Nessun giocatore");
    return;
  }

  let available = [...characters];

  // assegna randomicamente i personaggi
  for(const id in players){
    const rand = Math.floor(Math.random()*available.length);
    const selected = available.splice(rand,1)[0];
    await update(ref(db, `rooms/${roomCode}/players/${id}`), { characterId: selected.id });
  }

  await update(ref(db, `rooms/${roomCode}`), { status: "active" });
};

/* ============================
   RENDER PLAYERS / LOBBY
============================ */
function renderPlayers(players, status){
  playersList.innerHTML = "";
  for(const id in players){
    const p = players[id];
    let img = "images/unknown.jpeg"; // default

    if(status === "active" && id !== currentUser){
      const char = characters.find(c => c.id === p.characterId);
      if(char) img = char.image;
    }

    const div = document.createElement("div");
    div.className = "player-card";
    div.innerHTML = `
      <img src="${img}" class="avatar">
      <p>${p.nickname}</p>
    `;
    playersList.appendChild(div);
  }
}

/* ============================
   RENDER BOARD
============================ */
function renderBoard(){
  board.innerHTML = "";
  characters.forEach(c => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <img src="${c.image}">
      <p>${c.name}</p>
    `;
    card.onclick = () => card.classList.toggle("eliminated");
    board.appendChild(card);
  });
}

/* ============================
   LOGOUT
============================ */
logoutBtn.onclick = () => {
  currentUser = null;
  roomCode = null;
  isAdmin = false;

  gameScreen.classList.add("hidden");
  adminPanel.classList.add("hidden");
  mainNavbar.classList.add("hidden");
  loginScreen.classList.remove("hidden");
  roomInput.value = "";
};

/* ============================
   ADMIN PANEL LOGICA
============================ */
adminActionSelect.addEventListener("change", () => {
  adminUsersSection.classList.add("hidden");
  adminCharactersSection.classList.add("hidden");
  adminRoomsSection.classList.add("hidden");

  if(adminActionSelect.value === "users"){
    adminUsersSection.classList.remove("hidden");
    loadUsers();
  }
  if(adminActionSelect.value === "characters"){
    adminCharactersSection.classList.remove("hidden");
    loadCharacters();
  }
  if(adminActionSelect.value === "rooms"){
    adminRoomsSection.classList.remove("hidden");
    loadRooms();
  }
});

/* ============================
   LOAD USERS / APPROVE / DELETE
============================ */
function loadUsers(){
  onValue(ref(db, "users"), snap => {
    const users = snap.val() || {};
    usersList.innerHTML = "";
    for(const nick in users){
      const u = users[nick];
      const div = document.createElement("div");
      div.className = "admin-card";
      div.innerHTML = `
        <strong>${u.nickname}</strong>
        <span class="status-badge ${u.role==="admin"?"status-admin":u.status==="pending"?"status-pending":"status-approved"}">
          ${u.role==="admin"?"ADMIN":u.status}
        </span>
        ${u.status==="pending"?`<button onclick="approveUser('${nick}')">Approva</button>`:""}
        ${u.role!=="admin"?`<button onclick="removeUser('${nick}')">Elimina</button>`:""}
      `;
      usersList.appendChild(div);
    }
  });
}

window.approveUser = async nick => await update(ref(db, `users/${nick}`), { status: "approved" });
window.removeUser = async nick => await remove(ref(db, `users/${nick}`));

/* ============================
   LOAD / ADD / DELETE CHARACTERS
============================ */
addCharBtn.onclick = async () => {
  const file = charFileInput.files[0];
  if(!file) return alert("Seleziona immagine");
  const name = file.name.replace(/\.[^/.]+$/, "").toLowerCase().replace(/\s+/g,"");
  const reader = new FileReader();

  reader.onload = async e => {
    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img,0,0);
      const jpeg = canvas.toDataURL("image/jpeg",0.9);
      const id = Date.now();
      await set(ref(db, `characters/${id}`), { id, name, image: jpeg });
      alert("Personaggio aggiunto");
      charFileInput.value = "";
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
};

function loadCharacters(){
  onValue(ref(db, "characters"), snap => {
    const chars = snap.val() || {};
    characterList.innerHTML = "";
    for(const id in chars){
      const c = chars[id];
      const div = document.createElement("div");
      div.className = "admin-card";
      div.innerHTML = `
        <img src="${c.image}">
        <strong>${c.name}</strong>
        <button onclick="deleteCharacter('${id}')">Elimina</button>
      `;
      characterList.appendChild(div);
    }
  });
}

window.deleteCharacter = async id => {
  if(!confirm("Eliminare?")) return;
  await remove(ref(db, `characters/${id}`));
};

/* ============================
   LOAD / DELETE ROOMS
============================ */
function loadRooms(){
  onValue(ref(db, "rooms"), snap => {
    const rooms = snap.val() || {};
    roomsList.innerHTML = "";
    for(const code in rooms){
      const room = rooms[code];
      const div = document.createElement("div");
      div.className = "admin-card";
      div.innerHTML = `
        <strong>${code}</strong>
        <span>${room.status}</span>
        <button onclick="deleteRoom('${code}')">Termina</button>
      `;
      roomsList.appendChild(div);
    }
  });
}

window.deleteRoom = async code => await remove(ref(db, `rooms/${code}`));