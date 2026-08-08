# Racha do Grupo — guia de instalação (bem simples)

Siga na ordem. Não precisa entender de programação, só ir clicando.

## PARTE 1 — Criar o banco de dados (Firebase)

1. Acesse https://console.firebase.google.com e entre com sua conta Google.
2. Clique em "Adicionar projeto" (ou "Criar projeto").
3. Dê um nome (ex: "racha-do-grupo") e clique em "Continuar".
4. Pode desativar o Google Analytics (não precisa). Clique em "Criar projeto" e espere.
5. No menu da esquerda, clique em "Compilação" > "Firestore Database".
6. Clique em "Criar banco de dados".
7. Escolha "Iniciar no modo de teste" e clique em "Avançar", depois "Ativar".
8. Escolha a localização mais perto de você (ex: southamerica-east1) e confirme.
9. Depois que o banco abrir, clique na aba "Regras" (Rules) lá em cima.
10. Apague o que estiver escrito e cole o conteúdo do arquivo `firestore.rules.txt` que veio junto com este projeto.
11. Clique em "Publicar".

## PARTE 2 — Pegar as chaves do projeto

1. No menu da esquerda, clique no ícone de engrenagem ⚙️ > "Configurações do projeto".
2. Role para baixo até "Seus apps" e clique no ícone `</>` (Web).
3. Dê um apelido (ex: "racha-web") e clique em "Registrar app".
4. Vai aparecer um bloco de código com `const firebaseConfig = {...}`. Copie os valores de dentro dele.
5. Abra o arquivo `src/firebase.js` (dentro da pasta do projeto) e cole cada valor no lugar de "COLOQUE_AQUI" — `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.
6. Salve o arquivo.

## PARTE 3 — Colocar o projeto no GitHub (sem usar linha de comando)

1. Acesse https://github.com e crie uma conta gratuita (se ainda não tiver).
2. Clique no "+" no canto superior direito > "New repository".
3. Dê um nome (ex: "racha-do-grupo"), deixe como "Public", e clique em "Create repository".
4. Na tela do repositório vazio, clique em "uploading an existing file" (ou "Add file" > "Upload files").
5. Arraste TODOS os arquivos e pastas deste projeto (inclusive as pastas `src` e `public` inteiras) para dentro da área de upload.
6. Role para baixo e clique em "Commit changes".

## PARTE 4 — Publicar o site (Vercel)

1. Acesse https://vercel.com e clique em "Sign Up". Escolha "Continue with GitHub" pra conectar direto.
2. Depois de entrar, clique em "Add New..." > "Project".
3. Encontre o repositório "racha-do-grupo" que você criou e clique em "Import".
4. Não precisa mudar nada nas configurações — a Vercel já reconhece que é um projeto Vite.
5. Clique em "Deploy" e espere uns 2 minutos.
6. Quando terminar, vai aparecer um link tipo `racha-do-grupo.vercel.app` — esse é o link do seu app!

## PARTE 5 — Instalar no celular

1. Abra o link (`racha-do-grupo.vercel.app`) no navegador do celular (Chrome no Android, Safari no iPhone).
2. **Android (Chrome):** toque nos três pontinhos (⋮) no canto > "Adicionar à tela inicial" ou "Instalar app".
3. **iPhone (Safari):** toque no ícone de compartilhar (quadrado com seta) > "Adicionar à Tela de Início".
4. Pronto — vai aparecer um ícone verde "Racha" na tela, abrindo em tela cheia, sem barra de navegador.
5. Manda esse mesmo link pro grupo do WhatsApp pra cada um instalar também. Todo mundo que abrir esse link vê os mesmos dados (jogadores, jogos, ranking).

## Se algo der errado

- Tela branca ou erro ao abrir: confira se colou certinho as chaves no `src/firebase.js` (Parte 2).
- "Erro ao salvar": confira se publicou as regras do Firestore (Parte 1, passo 10-11) e se está com internet.
- Precisa mudar alguma coisa no código depois: edite o arquivo direto no GitHub (ícone de lápis no arquivo) — a Vercel republica sozinha em 1-2 minutos toda vez que você salvar uma mudança no GitHub.
