// 1. Importações do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// Adicionamos query e orderBy para ordenar os posts do mais novo pro mais velho
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. Configurações e Inicialização
const firebaseConfig = {
  apiKey: "AIzaSyA9M-0fxUhEACrxyOI3au7yxwACC4Xfplw",
  authDomain: "beast-feast.firebaseapp.com",
  projectId: "beast-feast",
  storageBucket: "beast-feast.firebasestorage.app",
  messagingSenderId: "1005054728418",
  appId: "1:1005054728418:web:db52f88f7c962789b366bb",
  measurementId: "G-R9QD685KXG"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Chave Mágica do ImgBB
const IMGBB_API_KEY = "dd740f5ed347ba95578161ba043d7312";

// 3. Variáveis de Interface
const btnLogin = document.getElementById('nav-login');
const welcomeScreen = document.querySelector('.welcome-screen');
let currentUser = null;

// Variáveis - Receitas
const btnNavRecipes = document.getElementById('nav-recipes');
const recipeSection = document.getElementById('recipe-section');
const btnNewRecipe = document.getElementById('btn-new-recipe');
const recipeFormContainer = document.getElementById('recipe-form-container');
const recipeForm = document.getElementById('recipe-form');
const btnCancelRecipe = document.getElementById('btn-cancel-recipe');
const recipesList = document.getElementById('recipes-list');

// Variáveis - Diário
const btnNavDiary = document.getElementById('nav-diary');
const diarySection = document.getElementById('diary-section');
const btnNewDiary = document.getElementById('btn-new-diary');
const diaryFormContainer = document.getElementById('diary-form-container');
const diaryForm = document.getElementById('diary-form');
const btnCancelDiary = document.getElementById('btn-cancel-diary');
const diaryList = document.getElementById('diary-list');

// ==========================================
// SISTEMA DE LOGIN
// ==========================================
const provider = new GoogleAuthProvider();

btnLogin.addEventListener('click', () => {
    if (currentUser) return;
    signInWithPopup(auth, provider).catch((error) => console.error("Erro no login:", error));
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
        // Se deslogar, joga pra tela inicial
        welcomeScreen.style.display = 'block';
        recipeSection.style.display = 'none';
        diarySection.style.display = 'none';
    }
});

// ==========================================
// NAVEGAÇÃO SUPERIOR
// ==========================================
btnNavRecipes.addEventListener('click', () => {
    if (!currentUser) { alert("Apenas aventureiros registrados podem ver o livro! Faça login."); return; }
    welcomeScreen.style.display = 'none';
    diarySection.style.display = 'none'; // Esconde o diário
    recipeSection.style.display = 'block'; // Mostra receitas
    carregarReceitas();
});

btnNavDiary.addEventListener('click', () => {
    if (!currentUser) { alert("Apenas aventureiros registrados podem ler o diário! Faça login."); return; }
    welcomeScreen.style.display = 'none';
    recipeSection.style.display = 'none'; // Esconde receitas
    diarySection.style.display = 'block'; // Mostra diário
    carregarDiario();
});

// ==========================================
// MÓDULO: RECEITAS
// ==========================================
btnNewRecipe.addEventListener('click', () => { recipeFormContainer.style.display = 'block'; });
btnCancelRecipe.addEventListener('click', () => { recipeFormContainer.style.display = 'none'; recipeForm.reset(); });

async function carregarReceitas() {
    recipesList.innerHTML = '<p>Folheando o grimório de receitas...</p>';
    try {
        // Ordena pela data, da mais nova pra mais velha ("desc")
        const q = query(collection(db, "receitas"), orderBy("data", "desc"));
        const querySnapshot = await getDocs(q);
        recipesList.innerHTML = '';

        if (querySnapshot.empty) { recipesList.innerHTML = '<p>O livro está vazio.</p>'; return; }

        querySnapshot.forEach((documento) => {
            const receita = documento.data();
            const idDaReceita = documento.id;
            const recipeCard = document.createElement('div');
            recipeCard.className = 'recipe-card';
            
            const nomeExibicao = receita.personagem ? `${receita.personagem} (${receita.autor})` : receita.autor;
            let botaoApagar = (currentUser && currentUser.uid === receita.autorId) ? `<button class="btn-delete recipe-del" data-id="${idDaReceita}">Apagar</button>` : '';
            const imagemHtml = receita.imagemUrl ? `<img src="${receita.imagemUrl}" class="recipe-photo">` : '';
            
            recipeCard.innerHTML = `
                <div class="recipe-card-header">
                    <h3>${receita.titulo}</h3>
                    ${botaoApagar}
                </div>
                ${imagemHtml}
                <p><strong>Cozinheiro:</strong> ${nomeExibicao}</p>
                <p><strong>Ingredientes:</strong><br>${receita.ingredientes.replace(/\n/g, '<br>')}</p>
                <p><strong>Preparo:</strong><br>${receita.preparo.replace(/\n/g, '<br>')}</p>
            `;
            recipesList.appendChild(recipeCard);
        });
    } catch (erro) { recipesList.innerHTML = '<p>Erro ao carregar receitas.</p>'; console.error(erro); }
}

recipeForm.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!currentUser) return;

    const btnSalvar = recipeForm.querySelector('.save-btn');
    const textoOriginal = btnSalvar.innerText;
    btnSalvar.innerText = "Assando o prato... (aguarde)";
    btnSalvar.disabled = true;

    try {
        let imagemUrl = "";
        const fileInput = document.getElementById('recipe-image');
        
        if (fileInput.files.length > 0) {
            const formData = new FormData();
            formData.append('image', fileInput.files[0]);
            const respostaImgbb = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, { method: 'POST', body: formData });
            const dadosImgbb = await respostaImgbb.json();
            if (dadosImgbb.success) imagemUrl = dadosImgbb.data.url;
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

        recipeForm.reset();
        recipeFormContainer.style.display = 'none';
        carregarReceitas();
    } catch (e) { alert("Erro ao salvar receita."); console.error(e); } 
    finally { btnSalvar.innerText = textoOriginal; btnSalvar.disabled = false; }
});

recipesList.addEventListener('click', async (evento) => {
    if (evento.target.classList.contains('recipe-del')) {
        if (confirm("Deseja mesmo queimar essa receita?")) {
            await deleteDoc(doc(db, "receitas", evento.target.getAttribute('data-id')));
            carregarReceitas();
        }
    }
});

// ==========================================
// MÓDULO: DIÁRIO DA CAMPANHA
// ==========================================
btnNewDiary.addEventListener('click', () => { diaryFormContainer.style.display = 'block'; });
btnCancelDiary.addEventListener('click', () => { diaryFormContainer.style.display = 'none'; diaryForm.reset(); });

async function carregarDiario() {
    diaryList.innerHTML = '<p>Desdobrando os pergaminhos...</p>';
    try {
        const q = query(collection(db, "diario"), orderBy("data", "desc"));
        const querySnapshot = await getDocs(q);
        diaryList.innerHTML = '';

        if (querySnapshot.empty) { diaryList.innerHTML = '<p>O diário está em branco. A aventura mal começou!</p>'; return; }

        querySnapshot.forEach((documento) => {
            const relato = documento.data();
            const idDoRelato = documento.id;
            const diaryCard = document.createElement('div');
            diaryCard.className = 'diary-card';
            
            // Formatando a data bonitinha
            const dataRelato = relato.data.toDate().toLocaleDateString('pt-BR');
            let botaoApagar = (currentUser && currentUser.uid === relato.autorId) ? `<button class="btn-delete diary-del" data-id="${idDoRelato}">Apagar</button>` : '';
            
            diaryCard.innerHTML = `
                <div class="diary-header">
                    <h3>${relato.titulo}</h3>
                    <div class="header-actions">
                        <span class="session-badge">Sessão ${relato.sessao}</span>
                        ${botaoApagar}
                    </div>
                </div>
                <div class="diary-meta">Escrito por ${relato.autor} em ${dataRelato}</div>
                <div class="diary-body">${relato.conteudo}</div>
            `;
            diaryList.appendChild(diaryCard);
        });
    } catch (erro) { diaryList.innerHTML = '<p>Erro ao carregar o diário.</p>'; console.error(erro); }
}

diaryForm.addEventListener('submit', async (evento) => {
    evento.preventDefault();
    if (!currentUser) return;

    try {
        await addDoc(collection(db, "diario"), {
            titulo: document.getElementById('diary-title').value,
            sessao: document.getElementById('diary-session').value,
            conteudo: document.getElementById('diary-content').value,
            autor: currentUser.displayName,
            autorId: currentUser.uid,
            data: new Date()
        });

        diaryForm.reset();
        diaryFormContainer.style.display = 'none';
        carregarDiario();
    } catch (e) { alert("Erro ao salvar relato."); console.error(e); }
});

diaryList.addEventListener('click', async (evento) => {
    if (evento.target.classList.contains('diary-del')) {
        if (confirm("Deseja apagar esse relato da história?")) {
            await deleteDoc(doc(db, "diario", evento.target.getAttribute('data-id')));
            carregarDiario();
        }
    }
});