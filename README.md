# BEAT//LINE - Android WebView v1

Este pacote acrescenta ao repositorio do jogo um aplicativo Android que abre o BEAT//LINE publicado no GitHub Pages.

Nao altera o HTML, CSS, JavaScript, Supabase ou o banco existente. Os MP3s continuam no Supabase. Nao ha login. A pagina `admin.html` nao aparece no aplicativo e nao e acessivel pela navegacao do WebView; a ADM do site continua independente.

## O que vem no pacote

- `android/`: projeto Android nativo (Java + WebView, sem Capacitor e sem dependencias de interface adicionais).
- `.github/workflows/beatline-android-apk.yml`: automacao que compila um APK de teste no GitHub Actions.
- `README.md`: estas instrucoes.

## Passo a passo - gerar o primeiro APK sem Android Studio

1. Certifique-se de que o site BEAT//LINE v6 esta publicado no GitHub Pages e funciona pelo navegador.
2. Abra o repositorio GitHub onde ja estao `index.html`, `admin.html`, `assets/` e `src/`.
3. Extraia este ZIP no computador.
4. Copie AS DUAS pastas `android` e `.github` para a RAIZ daquele mesmo repositorio. Nao copie uma pasta `beatline-android-v1` inteira para dentro do repositorio.
5. Confirme que a estrutura ficou assim:

   ```text
   repositorio-do-jogo/
     index.html
     admin.html
     assets/
     src/
     android/
       settings.gradle
       build.gradle
       app/
     .github/
       workflows/
         beatline-android-apk.yml
   ```

6. Faca commit e push desses arquivos (pelo GitHub Desktop, Git ou upload pela interface web).
7. No GitHub, entre em **Actions > BEATLINE - Gerar APK Android**. Caso nao comece automaticamente, clique em **Run workflow**.
8. Aguarde o job **build-apk** terminar com status verde.
9. Abra a execucao, encontre **Artifacts**, clique em **beatline-android-apk** e baixe o artefato.
10. Extraia o ZIP que o GitHub baixou: nele estara `app-debug.apk`. Envie o APK ao celular Android e instale. O Android pode pedir autorizacao para instalar aplicativos desta origem.

**Importante:** O ZIP entregue neste chat contem o PROJETO, nao um APK ja compilado. O APK e criado pelo GitHub Actions porque este ambiente nao tem o Android SDK instalado.

## Como a URL e definida automaticamente

O workflow detecta automaticamente o usuario e o nome do repositorio em que ele estiver rodando:

- Repositorio `meuusuario/beatline`: `https://meuusuario.github.io/beatline/`
- Repositorio especial `meuusuario/meuusuario.github.io`: `https://meuusuario.github.io/`

Se o jogo estiver publicado em um endereco diferente (por exemplo dominio proprio, subpasta ou site em outro repositorio), configure uma Repository variable no GitHub:

- Settings > Secrets and variables > Actions > Variables > New repository variable
- Name: `BEATLINE_GAME_URL`
- Value: URL COMPLETA com `https://`, por exemplo `https://jogo.exemplo.com/`

Depois execute o workflow novamente. Nao e preciso alterar o Java ou o Supabase.

## Atualizacoes futuras

- Atualizacao do site (HTML/CSS/JS): atualize o GitHub Pages; o mesmo APK passara a carregar o site atualizado. Pode haver cache temporario ate o navegador atualizar os arquivos.
- Atualizacao do catalogo ou MP3s: atualize pela ADM; o app passa a consultar os dados mais recentes do Supabase.
- Mudanca no icone, URL embutida ou codigo Android: gere um novo APK.
- O APK atual e `debug`, proprio para instalacao e teste fora da Play Store. Ele e assinado com a chave de debug do ambiente de build. Compilacoes futuras podem exigir desinstalar o APK anterior se a assinatura for diferente. Para atualizacoes instalaveis sem desinstalacao, precisaremos configurar assinatura de release com uma chave persistente.

## Comportamentos do aplicativo

- Icone Android derivado do favicon rosa do BEAT//LINE v6.
- WebView HTTPS em tela cheia; barra de endereco e menus de navegador ficam ocultos.
- Rotacao automatica para retrato/paisagem.
- JavaScript e DOM Storage habilitados para o funcionamento do jogo.
- Audio reproduzido sob comando do jogador (sem autoplay).
- Recurso de erro de conexao com botao para tentar novamente.
- Links externos, caso existam, abrem o navegador externo.
- `admin.html` bloqueado na navegacao interna do aplicativo; continua existindo no site e precisa de protecao separada se o site for publico.
- Internet necessaria para o site, para o Supabase e para os MP3s.

## Como compilar localmente (opcional)

Instale Android Studio, JDK 17, Gradle 8.11.1 e Android SDK 35. Na pasta `android/`:

```bash
gradle -PgameUrl=https://SEU-USUARIO.github.io/SEU-REPOSITORIO/ :app:assembleDebug
```

O APK sera criado em `android/app/build/outputs/apk/debug/app-debug.apk`.

## Seguranca

O APK nao contem senhas ou chaves de administrador; ele abre a pagina web publica. Continua valendo a advertencia sobre as permissoes anonimas de gravacao no Supabase usadas pelo prototipo. Ocultar a ADM no aplicativo nao equivale a proteger a rota `admin.html` ou a API do banco.

Nenhum SQL adicional e necessario para este pacote Android.
