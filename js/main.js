import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, getFirestore, orderBy, query, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

let currentUser = null;
let chefName = "Aventureiro";
let diaryTags = [];
let editingDiaryId = null;

const svgEdit = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`;
const svgDelete = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;

document.addEventListener('DOMContentLoaded', () => {
    const book = document.getElementById('book');
    const pageFlip = new St.PageFlip(book, { 
        width: 400, 
        height: 600, 
        size: "stretch", 
        minWidth: 315, 
        maxWidth: 1000, 
        minHeight: 420, 
        maxHeight: 1334, 
        showCover: true 
    });
    
    pageFlip.loadFromHTML(document.querySelectorAll('.page'));
    const chefNameInput = document.getElementById('chef-name');

    document.getElementById('confirm-chef-name').addEventListener('click', () => {
        if (!currentUser) signInWithPopup(auth, new GoogleAuthProvider()).catch(error => console.error("Erro no login:", error));
        else {
            chefName = chefNameInput.value.trim() || currentUser.displayName.split(' ')[0];
            if (pageFlip.getCurrentPageIndex() === 0) pageFlip.flipNext('top');
        }
    });

    onAuthStateChanged(auth, (user) => {
        if (user) {
            currentUser = user;
            const nameFromInput = chefNameInput.value.trim();
            chefName = nameFromInput || user.displayName.split(' ')[0];
            chefNameInput.value = chefName;
            if (pageFlip.getCurrentPageIndex() === 0) pageFlip.flipNext('top');
            
            // Carrega os dados antecipadamente para evitar lentidão
            carregarReceitas();
            carregarDiario();
        } else {
            currentUser = null;
            if (pageFlip.getCurrentPageIndex() > 0) pageFlip.flip(0, 'top');
        }
    });

    // Mapeamento corrigido: Índice (1), Receitas (2), Diário (3)
    document.getElementById('nav-recipes').addEventListener('click', () => { pageFlip.flip(2, 'top'); });
    document.getElementById('nav-diary').addEventListener('click', () => { pageFlip.flip(3, 'top'); });

    const recipeModal = document.getElementById('recipe-form-modal');
    const diaryModal = document.getElementById('diary-form-modal');
    
    document.getElementById('btn-new-recipe').addEventListener('click', async () => {
        if (!await verificarSenha()) return;
        recipeModal.classList.remove('hidden');
    });
    
    document.getElementById('btn-cancel-recipe').addEventListener('click', () => recipeModal.classList.add('hidden'));
    
    document.getElementById('btn-new-diary').addEventListener('click', async () => {
        if (!await verificarSenha()) return;
        editingDiaryId = null;
        diaryTags = [];
        document.getElementById('diary-form-title').innerText = "Escrever no Diário";
        document.getElementById('btn-save-diary').innerText = "Guardar Memória";
        document.getElementById('diary-form').reset();
        renderizarTagsFormulario();
        diaryModal.classList.remove('hidden');
    });
    
    document.getElementById('btn-cancel-diary').addEventListener('click', () => diaryModal.classList.add('hidden'));

    setupDiaryForm(diaryModal);
    setupRecipeForm(recipeModal);
    setupTagSystem();
});

async function verificarSenha() {
    let senhaOficial = "dragão";
    try {
        const docRef = await getDoc(doc(db, "config", "seguranca"));
        if (docRef.exists()) senhaOficial = docRef.data().palavraChave;
    } catch (e) { console.warn("Não consegui ler a senha do cofre."); }
    const tentativa = prompt("Diga a palavra-passe para modificar o livro!");
    if (!tentativa || tentativa.trim().toLowerCase() !== senhaOficial.toLowerCase()) {
        alert("Acesso Negado! Os guardas te expulsaram.");
        return false;
    }
    return true;
}

function setupRecipeForm(modal) {
    const form = document.getElementById('recipe-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!currentUser) return;
        const btn = form.querySelector('.save-btn');
        btn.innerText = "Assando..."; btn.disabled = true;
        try {
            let imagemUrl = "";
            const fileInput = document.getElementById('recipe-image');
            if (fileInput.files.length > 0) {
                const formData = new FormData();
                formData.append('image', fileInput.files[0]);
                const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
                const d = await res.json();
                if (d.success) imagemUrl = d.data.url;
            }
            await addDoc(collection(db, "receitas"), {
                titulo: document.getElementById('recipe-title').value,
                personagem: document.getElementById('recipe-character').value,
                ingredientes: document.getElementById('recipe-ingredients').value,
                preparo: document.getElementById('recipe-steps').value,
                autor: currentUser.displayName,
                autorId: currentUser.uid,
                imagemUrl: imagemUrl,
                data: new Date()
            });
            form.reset();
            modal.classList.add('hidden');
            carregarReceitas();
        } catch (err) { console.error(err); } finally { btn.innerText = "Salvar no Livro"; btn.disabled = false; }
    });

    document.getElementById('recipes-list-container').addEventListener('click', async (e) => {
        const btnDel = e.target.closest('.recipe-del');
        if (btnDel) {
            if (!await verificarSenha()) return;
            if (confirm("Queimar receita?")) {
                await deleteDoc(doc(db, "receitas", btnDel.getAttribute('data-id')));
                carregarReceitas();
            }
        }
    });
}

async function carregarReceitas() {
    const container = document.getElementById('recipes-list-container');
    container.innerHTML = '<p>Buscando receitas...</p>';
    const querySnapshot = await getDocs(query(collection(db, "receitas"), orderBy("data", "desc")));
    container.innerHTML = '';
    if (querySnapshot.empty) { container.innerHTML = '<p>Nenhuma receita encontrada.</p>'; return; }
    querySnapshot.forEach((docSnap) => {
        const r = docSnap.data();
        const card = document.createElement('div');
        card.className = 'recipe-card';
        const btn = (currentUser && currentUser.uid === r.autorId) ? `<button class="icon-btn delete-btn recipe-del" data-id="${docSnap.id}">${svgDelete}</button>` : '';
        const nome = r.personagem ? `${r.personagem} (${r.autor})` : r.autor;
        const img = r.imagemUrl ? `<img src="${r.imagemUrl}" class="recipe-photo">` : '';
        card.innerHTML = `<div class="recipe-card-header"><h3>${r.titulo}</h3>${btn}</div>${img}<p><strong>Cozinheiro:</strong> ${nome}</p><p><strong>Ingredientes:</strong><br>${r.ingredientes.replace(/\n/g, '<br>')}</p><p><strong>Preparo:</strong><br>${r.preparo.replace(/\n/g, '<br>')}</p>`;
        container.appendChild(card);
    });
}

function setupDiaryForm(modal) {
    const form = document.getElementById('diary-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
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
                await updateDoc(doc(db, "diario", editingDiaryId), relatoData);
            } else {
                relatoData.data = new Date();
                await addDoc(collection(db, "diario"), relatoData);
            }
            form.reset();
            modal.classList.add('hidden');
            carregarDiario();
        } catch (e) { alert("Erro ao salvar."); console.error(e); }
    });

    document.getElementById('diary-list-container').addEventListener('click', async (e) => {
        const btnDel = e.target.closest('.diary-del');
        const btnEdit = e.target.closest('.diary-edit');
        if (btnDel) {
            if (!await verificarSenha()) return;
            if (confirm("Deseja apagar esse relato?")) {
                await deleteDoc(doc(db, "diario", btnDel.getAttribute('data-id')));
                carregarDiario();
            }
        }
        if (btnEdit) {
            if (!await verificarSenha()) return;
            const card = btnEdit.closest('.diary-card');
            const relato = JSON.parse(card.dataset.relato);
            editingDiaryId = btnEdit.getAttribute('data-id');
            document.getElementById('diary-form-title').innerText = "Editar Relato";
            document.getElementById('btn-save-diary').innerText = "Atualizar Memória";
            document.getElementById('diary-title').value = relato.titulo;
            document.getElementById('diary-character').value = relato.personagem || '';
            document.getElementById('diary-session').value = relato.sessao;
            document.getElementById('diary-fear').value = relato.medo || 0;
            document.getElementById('diary-content').value = relato.conteudo;
            diaryTags = relato.tags || [];
            renderizarTagsFormulario();
            modal.classList.remove('hidden');
        }
    });
}

async function carregarDiario() {
    const container = document.getElementById('diary-list-container');
    container.innerHTML = '<p>Desdobrando os pergaminhos...</p>';
    const querySnapshot = await getDocs(query(collection(db, "diario"), orderBy("data", "desc")));
    container.innerHTML = '';
    if (querySnapshot.empty) { container.innerHTML = '<p>O diário está em branco.</p>'; return; }
    querySnapshot.forEach((docSnap) => {
        const relato = docSnap.data();
        const card = document.createElement('div');
        card.className = 'diary-card';
        card.dataset.relato = JSON.stringify(relato);
        let actionButtons = '';
        if (currentUser && currentUser.uid === relato.autorId) {
            actionButtons = `<button class="icon-btn edit-btn diary-edit" data-id="${docSnap.id}">${svgEdit}</button><button class="icon-btn delete-btn diary-del" data-id="${docSnap.id}">${svgDelete}</button>`;
        }
        let tagsHtml = '';
        if (relato.tags && relato.tags.length > 0) {
            tagsHtml = '<div class="tags-list">' + relato.tags.map(t => `<span class="rpg-tag" style="background-color: ${t.color}">${t.name}</span>`).join('') + '</div>';
        }
        card.innerHTML = `<div class="diary-header"><h3>${relato.titulo}</h3><div class="header-actions">${actionButtons}</div></div><div class="diary-badges"><span class="badge session-badge">Sessão ${relato.sessao}</span><span class="badge fear-badge">💀 Medo: ${relato.medo}/12</span></div><div class="diary-meta">Registrado por ${relato.personagem || relato.autor} em ${relato.data.toDate().toLocaleDateString('pt-BR')}</div><div class="diary-body">${relato.conteudo}</div>${tagsHtml}`;
        container.appendChild(card);
    });
}

function setupTagSystem() {
    document.getElementById('btn-add-tag').addEventListener('click', () => {
        const nameInput = document.getElementById('tag-name');
        if (nameInput.value.trim() !== '') {
            diaryTags.push({ name: nameInput.value.trim(), color: document.getElementById('tag-color').value });
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
}

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