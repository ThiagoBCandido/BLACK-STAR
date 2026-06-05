# BLACK STAR!

**BLACK STAR!** é uma aplicação web de música desenvolvida com Angular, inspirada na experiência de players musicais modernos, mas com uma identidade visual própria: interface escura, foco em playlists, player com toca-discos/vinil e integração real com o Spotify.

O projeto utiliza a **Spotify Web API** e o **Spotify Web Playback SDK** para autenticação, leitura de dados do usuário, playlists, músicas recentes, faixas mais ouvidas e controle de reprodução.

---

## Sobre o projeto

A proposta do BLACK STAR! é criar um player musical com uma experiência mais visual e personalizada, fugindo da aparência tradicional de clones do Spotify.

A aplicação conta com uma interface mobile-first, visual preto predominante, capas de músicas coloridas, mini player fixo e uma tela de player expandido com toca-discos animado.

Atualmente, o projeto já possui integração com Spotify, autenticação via PKCE, listagem de playlists reais, tela de detalhes da playlist, fila de reprodução e controle básico do player.

---

## Funcionalidades atuais

* Autenticação com Spotify via PKCE
* Exibição do perfil do usuário autenticado
* Home com playlists do usuário
* Listagem de músicas recentes
* Listagem de faixas mais ouvidas
* Tela de biblioteca com playlists reais do Spotify
* Tela de detalhes da playlist
* Capa da playlist em destaque
* Nome, descrição e quantidade de músicas da playlist
* Busca dentro da playlist
* Reprodução de músicas via Spotify Web Playback SDK
* Mini player fixo
* Player expandido com visual de toca-discos
* Disco animado durante a reprodução
* Barra de progresso da música
* Controle de play/pause
* Controle de próxima e música anterior
* Controle de volume
* Shuffle e repeat
* Curtir/descurtir música
* Adicionar música a playlists
* Criar playlists
* Fila de reprodução baseada na playlist atual
* Aba de detalhes da música atual no player expandido
* Acesso para abrir a faixa diretamente no Spotify

---

## Tecnologias utilizadas

* Angular
* TypeScript
* Tailwind CSS
* Spotify Web API
* Spotify Web Playback SDK
* HTML
* CSS
* RxJS / Signals do Angular
* LocalStorage para controle de sessão/token

---

## Estrutura geral

```txt
src/
├── app/
│   ├── components/
│   │   ├── home-screen/
│   │   ├── library-screen/
│   │   ├── search-screen/
│   │   ├── profile-screen/
│   │   ├── mini-player/
│   │   ├── full-player/
│   │   ├── bottom-nav/
│   │   ├── track-list-item/
│   │   ├── track-options-sheet/
│   │   ├── add-to-playlist-sheet/
│   │   └── create-playlist-sheet/
│   │
│   ├── core/
│   │   ├── models/
│   │   ├── services/
│   │   │   ├── spotify-auth.service.ts
│   │   │   ├── spotify-api.service.ts
│   │   │   ├── spotify-player.service.ts
│   │   │   └── player-state.service.ts
│   │   │
│   │   └── state/
│   │       ├── browse-state.service.ts
│   │       ├── library-state.service.ts
│   │       ├── playback-state.service.ts
│   │       ├── navigation-state.service.ts
│   │       └── search-state.service.ts
│   │
│   └── app.component.*
│
├── assets/
│   └── icons/
│
└── environments/
```

---

## Telas principais

### Home

A tela inicial exibe as playlists do usuário, músicas em destaque, faixas mais ouvidas e músicas tocadas recentemente.

A ideia da Home é funcionar como uma entrada rápida para a experiência musical, sem depender de menus redundantes.

### Library

A biblioteca mostra playlists reais do usuário autenticado no Spotify. Ao selecionar uma playlist, o usuário acessa uma tela de detalhes com capa, nome, descrição, contador de músicas, busca interna e lista de faixas.

### Player expandido

O player expandido é a principal identidade visual do projeto. Ele apresenta um toca-discos com disco animado, arte da música no centro do vinil, controles de reprodução, volume, progresso e uma área inferior com fila e detalhes da faixa atual.

### Mini player

O mini player permanece fixo na parte inferior da tela, permitindo acesso rápido ao player completo e controles básicos de reprodução.

---

## Integração com Spotify

O projeto utiliza autenticação via OAuth com PKCE, permitindo que o usuário conecte sua conta Spotify com segurança.

A aplicação consome dados como:

* Perfil do usuário
* Playlists
* Faixas de playlists
* Músicas salvas
* Músicas recentes
* Top tracks
* Estado de reprodução
* Controle do player

---

## Limitações atuais

Por utilizar a API oficial do Spotify, algumas limitações existem:

* A reprodução no navegador exige conta Spotify Premium
* Em modo de desenvolvimento, apenas usuários adicionados no Spotify Developer Dashboard conseguem autenticar
* A API oficial do Spotify não fornece letras de músicas
* Algumas faixas podem estar indisponíveis dependendo da região, restrições do Spotify ou estado da música na playlist

---

## Como executar o projeto

Clone o repositório:

```bash
git clone https://github.com/seu-usuario/black-star.git
```

Acesse a pasta do projeto:

```bash
cd black-star
```

Instale as dependências:

```bash
npm install
```

Execute a aplicação localmente:

```bash
ng serve --host 127.0.0.1 --port 4200
```

Acesse no navegador:

```txt
http://127.0.0.1:4200
```

---

## Configuração do Spotify

Para a integração funcionar, é necessário criar uma aplicação no Spotify Developer Dashboard e configurar as credenciais no environment do Angular.

Exemplo:

```ts
export const environment = {
  spotify: {
    clientId: 'SEU_CLIENT_ID',
    redirectUri: 'http://127.0.0.1:4200',
    scopes: [
      'user-read-private',
      'user-read-email',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'streaming',
      'playlist-read-private',
      'playlist-read-collaborative',
      'playlist-modify-private',
      'playlist-modify-public',
      'user-library-read',
      'user-library-modify',
      'user-read-recently-played',
      'user-top-read'
    ]
  }
};
```

Também é necessário cadastrar o redirect URI no Spotify Developer Dashboard:

```txt
http://127.0.0.1:4200
```

---

## Status do projeto

O BLACK STAR! ainda está em desenvolvimento.

No momento, o foco está em melhorar a experiência do player, organizar a fila de reprodução, refinar a tela de detalhes das playlists e tornar a aplicação mais estável para uso real com Spotify.

---

## Objetivo

O objetivo do projeto é demonstrar conhecimentos em desenvolvimento front-end moderno, consumo de APIs externas, autenticação OAuth, organização de estado, componentização e criação de uma interface musical com identidade visual própria.

BLACK STAR! não busca ser apenas uma cópia de um player existente, mas sim uma aplicação musical com personalidade própria e foco em experiência visual.
