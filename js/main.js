import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// Adicionado updateDoc para a função de Editar!
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyA9M-0fxUhEACrxyOI3au7yxwACC4Xfplw",
  authDomain: "beast-feast.firebaseapp.com",
  projectId: "beast-feast",
  storageBucket: "beast-feast.firebasestorage.app",
  messagingSenderId: "1005054728418",
  appId: "1:1005054728418:web:db52f88f7c962789b366bb"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const IMGBB_API_KEY = "dd740f5ed347ba95578161ba043d7312";

// SVGs (Ícones)
const svgEdit = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const svgDelete = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

const btnLogin = document.getElementById('nav-login');
const welcomeScreen = document.querySelector('.welcome-screen');
let currentUser = null;

// Receitas
const btnNavRecipes = document.getElementById('nav-recipes');
const recipeSection = document.getElementById('recipe-section');
const recipesList = document.getElementById('recipes-list');

// Diário
const btnNavDiary = document.getElementById('nav-diary');
const diarySection = document.getElementById('diary-section');
const diaryFormContainer = document.getElementById('diary-form-container');
const diaryForm = document.getElementById('diary-form');
const diaryList = document.getElementById('diary-list');

// Variáveis de Controle do Diário
let diaryTags = []; // Guarda as tags temporariamente
let editingDiaryId = null; // Guarda o ID se estivermos editando

// ==========================================
// LOGIN & NAV
// ==========================================
btnLogin.addEventListener('click', () => {
    if (!currentUser) signInWithPopup(auth, new GoogleAuthProvider()).catch(e => console.error(e));
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        btnLogin.innerText = `Sair (${user.displayName.split(' ')[0]})`;
        btnLogin.style.backgroundColor = "#2e4d35";
    } else {
        currentUser = null;
        btnLogin.innerText = "Entrar";
        btnLogin.style.backgroundColor = "#8b0000";
        welcomeScreen.style.display = 'block';
        recipeSection.style.display = 'none';
        diarySection.style.display = 'none';
    }
});

btnNavRecipes.addEventListener('click', () => {
    if (!currentUser) return alert("Faça login!");
    welcomeScreen.style.display = 'none'; diarySection.style.display = 'none'; recipeSection.style.display = 'block';
    carregarReceitas();
});

btnNavDiary.addEventListener('click', () => {
    if (!currentUser) return alert("Faça login!");
    welcomeScreen.style.display = 'none'; recipeSection.style.display = 'none'; diarySection.style.display = 'block';
    carregarDiario();
});

// ==========================================
// SISTEMA DE TAGS NO FORMULÁRIO
// ==========================================
function renderizarTagsFormulario() {
    const preview = document.getElementById('tags-preview');
    preview.innerHTML = '';
    diaryTags.forEach((tag, index) => {
        const div = document.createElement('div');
        div.className = 'rpg-tag';
        div.style.backgroundColor = tag.color;
        div.innerHTML = `<span>${tag.name}</span> <button type="button" class="remove-tag" data-index="${index}">×</button>`;
        preview.appendChild(div);
    });
}

document.getElementById('btn-add-tag').addEventListener('click', () => {
    const nameInput = document.getElementById('tag-name');
    const colorInput = document.getElementById('tag-color');
    if (nameInput.value.trim() !== '') {
        diaryTags.push({ name: nameInput.value.trim(), color: colorInput.value });
        nameInput.value = '';
        renderizarTagsFormulario();
    }
});

document.getElementById('tags-preview').addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-tag')) {
        diaryTags.splice(e.target.getAttribute('data-index'), 1);
        renderizarTagsFormulario();
    }
});

// ==========================================
// MÓDULO: DIÁRIO
// ==========================================
document.getElementById('btn-new-diary').addEventListener('click', () => {
    editingDiaryId = null;
    diaryTags = [];
    document.getElementById('diary-form-title').innerText = "Escrever no Diário";
    document.getElementById('btn-save-diary').innerText = "Guardar Memória";
    diaryForm.reset();
    renderizarTagsFormulario();
    diaryFormContainer.style.display = 'block';
});

document.getElementById('btn-cancel-diary').addEventListener('click', () => {
    diaryFormContainer.style.display = 'none';
    diaryForm.reset();
});

async function carregarDiario() {
    diaryList.innerHTML = '<p>Desdobrando os pergaminhos...</p>';
    try {
        const q = query(collection(db, "diario"), orderBy("data", "desc"));
        const querySnapshot = await getDocs(q);
        diaryList.innerHTML = '';

        if (querySnapshot.empty) { diaryList.innerHTML = '<p>O diário está em branco.</p>'; return; }

        querySnapshot.forEach((docSnap) => {
            const relato = docSnap.data();
            const idDoRelato = docSnap.id;
            const card = document.createElement('div');
            card.className = 'diary-card';
            
            const dataRelato = relato.data.toDate().toLocaleDateString('pt-BR');
            const nomeExibicao = relato.personagem ? `${relato.personagem} (${relato.autor})` : relato.autor;
            
            // Botões de Ação (SVGs)
            let actionButtons = '';
            if (currentUser && currentUser.uid === relato.autorId) {
                actionButtons = `
                    <button class="icon-btn edit-btn diary-edit" data-id="${idDoRelato}" title="Editar">${svgEdit}</button>
                    <button class="icon-btn delete-btn diary-del" data-id="${idDoRelato}" title="Apagar">${svgDelete}</button>
                `;
            }

            // Gerar HTML das Tags
            let tagsHtml = '';
            if (relato.tags && relato.tags.length > 0) {
                tagsHtml = '<div class="tags-list">' + relato.tags.map(t => `<span class="rpg-tag" style="background-color: ${t.color}">${t.name}</span>`).join('') + '</div>';
            }
            
            card.innerHTML = `
                <div class="diary-header">
                    <h3>${relato.titulo}</h3>
                    <div class="header-actions">${actionButtons}</div>
                </div>
                <div class="diary-badges">
                    <span class="badge session-badge">Sessão ${relato.sessao}</span>
                    <span class="badge fear-badge">💀 Medo: ${relato.medo}/12</span>
                </div>
                <div class="diary-meta">Registrado por ${nomeExibicao} em ${dataRelato}</div>
                <div class="diary-body">${relato.conteudo}</div>
                ${tagsHtml}
            `;
            
            // Salva os dados brutos no elemento caso a pessoa queira editar
            card.dataset.relato = JSON.stringify(relato);
            diaryList.appendChild(card);
        });
    } catch (erro) { console.error(erro); }
}

diaryForm.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!currentUser) return;

    const relatoData = {
        titulo: document.getElementById('diary-title').value,
        personagem: document.getElementById('diary-character').value,
        sessao: document.getElementById('diary-session').value,
        medo: document.getElementById('diary-fear').value,
        conteudo: document.getElementById('diary-content').value,
        tags: diaryTags,
        autor: currentUser.displayName,
        autorId: currentUser.uid
    };

    try {
        if (editingDiaryId) {
            // Se tem um ID, nós ATUALIZAMOS
            await updateDoc(doc(db, "diario", editingDiaryId), relatoData);
        } else {
            // Se não tem ID, nós CRIAMOS um novo (e adicionamos a data)
            relatoData.data = new Date();
            await addDoc(collection(db, "diario"), relatoData);
        }
        diaryFormContainer.style.display = 'none';
        carregarDiario();
    } catch (e) { alert("Erro ao salvar."); console.error(e); }
});

// Delegação de cliques para Editar/Apagar no Diário
diaryList.addEventListener('click', async (evento) => {
    const btnDel = evento.target.closest('.diary-del');
    const btnEdit = evento.target.closest('.diary-edit');

    if (btnDel) {
        if (confirm("Deseja apagar esse relato da história?")) {
            await deleteDoc(doc(db, "diario", btnDel.getAttribute('data-id')));
            carregarDiario();
        }
    }

    if (btnEdit) {
        const id = btnEdit.getAttribute('data-id');
        const card = btnEdit.closest('.diary-card');
        const relato = JSON.parse(card.dataset.relato);

        // Preenche o formulário com os dados antigos
        document.getElementById('diary-title').value = relato.titulo;
        document.getElementById('diary-character').value = relato.personagem || '';
        document.getElementById('diary-session').value = relato.sessao;
        document.getElementById('diary-fear').value = relato.medo || 0;
        document.getElementById('diary-content').value = relato.conteudo;
        
        diaryTags = relato.tags || [];
        renderizarTagsFormulario();

        editingDiaryId = id; // Marca que estamos editando!
        document.getElementById('diary-form-title').innerText = "Editar Relato";
        document.getElementById('btn-save-diary').innerText = "Atualizar Memória";
        diaryFormContainer.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' }); // Rola a página pro topo
    }
});

// ==========================================
// MÓDULO: RECEITAS (Resumido para espaço)
// ==========================================
document.getElementById('btn-new-recipe').addEventListener('click', () => { document.getElementById('recipe-form-container').style.display = 'block'; });
document.getElementById('btn-cancel-recipe').addEventListener('click', () => { document.getElementById('recipe-form-container').style.display = 'none'; document.getElementById('recipe-form').reset(); });

async function carregarReceitas() { /* ... O código das receitas continua igual ao que te mandei antes, mas adicione os SVGs se quiser! ... */ 
    recipesList.innerHTML = '';
    const querySnapshot = await getDocs(query(collection(db, "receitas"), orderBy("data", "desc")));
    querySnapshot.forEach((docSnap) => {
        const r = docSnap.data();
        const card = document.createElement('div'); card.className = 'recipe-card';
        const img = r.imagemUrl ? `<img src="${r.imagemUrl}" class="recipe-photo">` : '';
        const btn = (currentUser && currentUser.uid === r.autorId) ? `<button class="icon-btn delete-btn recipe-del" data-id="${docSnap.id}">${svgDelete}</button>` : '';
        const nome = r.personagem ? `${r.personagem} (${r.autor})` : r.autor;
        
        card.innerHTML = `
            <div class="recipe-card-header"><h3>${r.titulo}</h3>${btn}</div>
            ${img} <p><strong>Cozinheiro:</strong> ${nome}</p>
            <p><strong>Ingredientes:</strong><br>${r.ingredientes.replace(/\n/g, '<br>')}</p>
            <p><strong>Preparo:</strong><br>${r.preparo.replace(/\n/g, '<br>')}</p>
        `;
        recipesList.appendChild(card);
    });
}

document.getElementById('recipe-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    const btn = document.getElementById('recipe-form').querySelector('.save-btn');
    btn.innerText = "Assando..."; btn.disabled = true;
    try {
        let imagemUrl = ""; const fileInput = document.getElementById('recipe-image');
        if (fileInput.files.length > 0) {
            const formData = new FormData(); formData.append('image', fileInput.files[0]);
            const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
            const d = await res.json(); if (d.success) imagemUrl = d.data.url;
        }
        await addDoc(collection(db, "receitas"), {
            titulo: document.getElementById('recipe-title').value, personagem: document.getElementById('recipe-character').value,
            ingredientes: document.getElementById('recipe-ingredients').value, preparo: document.getElementById('recipe-steps').value,
            autor: currentUser.displayName, autorId: currentUser.uid, imagemUrl: imagemUrl, data: new Date()
        });
        document.getElementById('recipe-form').reset(); document.getElementById('recipe-form-container').style.display = 'none'; carregarReceitas();
    } catch (err) { console.error(err); } finally { btn.innerText = "Salvar no Livro"; btn.disabled = false; }
});

recipesList.addEventListener('click', async (e) => {
    const btnDel = e.target.closest('.recipe-del');
    if (btnDel && confirm("Queimar receita?")) { await deleteDoc(doc(db, "receitas", btnDel.getAttribute('data-id'))); carregarReceitas(); }
});