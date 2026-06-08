# BLACK STAR!

**BLACK STAR!** é uma aplicação web de player musical com foco em uma experiência mobile-first, inspirada em plataformas modernas de streaming, mas com uma identidade visual própria: escura, minimalista e imersiva.

O projeto foi desenvolvido com **Angular** e **Tailwind CSS**, integrando recursos da **Spotify Web API** e do **Spotify Web Playback SDK** para carregar dados reais do usuário, playlists, busca, biblioteca, perfil e controles de reprodução.

A aplicação também possui um **Modo Demo**, permitindo que qualquer pessoa explore a interface, playlists, busca e player visual sem precisar conectar uma conta Spotify.

---

## Deploy

Aplicação publicada na Vercel:

```txt
https://black-star-six.vercel.app
```

---

## Funcionalidades

* Autenticação com Spotify usando fluxo PKCE
* Integração com perfil do Spotify
* Carregamento de playlists reais do usuário
* Tela de detalhes da playlist
* Busca de músicas pela Spotify API
* Músicas curtidas
* Músicas tocadas recentemente
* Top tracks do usuário
* Reprodução baseada em fila
* Full player com interface de toca-discos animado
* Mini player
* Interface mobile-first
* Modo Demo com músicas e playlists fictícias
* Tratamento amigável de erros do Spotify
* Tela de perfil para usuário real e usuário demo
* Deploy na Vercel
* Configuração de ambiente gerada automaticamente durante o build

---

## Modo Demo

O **Modo Demo** permite testar o BLACK STAR! sem precisar de login no Spotify.

Nesse modo, a aplicação utiliza dados fictícios para simular a experiência real do app.

O Modo Demo inclui:

* Playlists fictícias
* Músicas fictícias
* Busca local
* Player visual
* Navegação pela biblioteca
* Tela de perfil demo
* Funcionamento de fila
* Controles visuais de reprodução

Esse modo torna o projeto mais acessível para apresentação, portfólio e testes rápidos.

---

## Modo Spotify

Ao conectar uma conta Spotify, o BLACK STAR! consegue carregar dados reais do usuário, como:

* Perfil do Spotify
* Playlists
* Músicas curtidas
* Músicas tocadas recentemente
* Top tracks
* Busca de músicas
* Controles de reprodução

Algumas funcionalidades do Spotify podem exigir:

* Conta Spotify Premium
* Usuário autorizado como tester no Spotify Developer Dashboard
* Redirect URI configurado corretamente
* Navegador/dispositivo compatível com o Spotify Web Playback SDK

---

## Tecnologias utilizadas

* Angular
* TypeScript
* Tailwind CSS
* Spotify Web API
* Spotify Web Playback SDK
* Autenticação PKCE
* Vercel
* LocalStorage
* HTML
* CSS

---

## Estrutura do projeto

```txt
src/
├── app/
│   ├── components/
│   │   ├── home-screen/
│   │   ├── search-screen/
│   │   ├── library-screen/
│   │   ├── profile-screen/
│   │   ├── full-player/
│   │   ├── mini-player/
│   │   ├── bottom-nav/
│   │   └── track-list-item/
│   │
│   ├── core/
│   │   ├── data/
│   │   ├── models/
│   │   ├── services/
│   │   ├── state/
│   │   └── utils/
│   │
│   └── app.component.*
│
├── assets/
├── environments/
├── manifest.webmanifest
└── styles.css
```

---

## Principais telas

### Home

A tela inicial exibe atalhos para o perfil, playlists, destaque musical, lançamentos e músicas tocadas recentemente.

### Search

A tela de busca funciona tanto no Modo Spotify quanto no Modo Demo.

No Modo Spotify, a busca é feita diretamente pela Spotify API.

No Modo Demo, a busca é feita dentro do catálogo fictício local do BLACK STAR!.

### Library

A biblioteca centraliza as principais áreas musicais do usuário:

* Liked Songs
* Recently Played
* Top Tracks
* Playlists
* Detalhes da playlist

### Full Player

O full player é o destaque visual da aplicação, trazendo uma interface inspirada em um toca-discos.

Ele inclui:

* Toca-discos animado
* Informações da música atual
* Botão de curtir
* Opções da faixa
* Barra de progresso
* Shuffle
* Anterior / Próxima
* Play / Pause
* Repeat
* Painel de fila
* Painel de detalhes da faixa

### Profile

A tela de perfil se adapta ao modo atual da aplicação:

* Exibe dados reais quando conectado ao Spotify
* Exibe um perfil demo quando o Modo Demo está ativo
* Mostra mensagens amigáveis quando há erro de conexão ou reprodução com Spotify

---

## Variáveis de ambiente

A aplicação utiliza variáveis de ambiente para evitar expor configurações diretamente no repositório.

Variáveis necessárias:

```txt
SPOTIFY_CLIENT_ID
SPOTIFY_REDIRECT_URI
```

Exemplo:

```txt
SPOTIFY_CLIENT_ID=seu_client_id_do_spotify
SPOTIFY_REDIRECT_URI=https://black-star-six.vercel.app
```

O arquivo `src/environments/environment.ts` é gerado automaticamente durante o build através do script:

```txt
scripts/create-env.mjs
```

---

## Como rodar localmente

Instale as dependências:

```bash
npm install
```

Inicie o projeto localmente:

```bash
ng serve --host 127.0.0.1 --port 4200
```

Acesse:

```txt
http://127.0.0.1:4200
```

---

## Build

Para gerar o build de produção:

```bash
npm run build
```

O build final é gerado em:

```txt
dist/blackstar/browser
```

---

## Configuração da Vercel

O projeto utiliza um arquivo `vercel.json` para configurar o diretório de saída e o comportamento de SPA.

```json
{
  "outputDirectory": "dist/blackstar/browser",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

Essa configuração garante que o Angular funcione corretamente após o deploy, inclusive em recarregamentos de página.

---

## Redirect URI do Spotify

Para que o login com Spotify funcione em produção, a URL do deploy precisa estar cadastrada no Spotify Developer Dashboard.

Exemplos de Redirect URIs:

```txt
http://127.0.0.1:4200
http://127.0.0.1:4200/callback
https://black-star-six.vercel.app
https://black-star-six.vercel.app/
```

A URL configurada na variável `SPOTIFY_REDIRECT_URI` precisa corresponder exatamente a uma das URLs cadastradas no Spotify Dashboard.

---

## Limitações

Alguns recursos dependem das regras e limitações da própria plataforma Spotify.

O funcionamento completo do modo Spotify pode depender de:

* Conta Spotify Premium
* Usuário autorizado como tester no Spotify Developer Dashboard
* Redirect URI configurado corretamente
* Sessão ativa no Spotify
* Navegador compatível com o Spotify Web Playback SDK

Para usuários que querem apenas explorar a interface e o fluxo do app, o **Modo Demo** está disponível sem necessidade de login.

---

## Status do projeto

Estado atual do projeto:

```txt
Concluído:
- Interface principal
- Home
- Search
- Library
- Detalhes de playlist
- Liked Songs
- Recently Played
- Top Tracks
- Full player
- Mini player
- Modo Demo
- Integração com Spotify
- Tela de perfil
- Tratamento de erros
- Configuração para deploy na Vercel
```

---

## Autor

Desenvolvido por **Thiago Barbosa Candido**.

GitHub:

```txt
https://github.com/ThiagoBCandido
```
