# BEAT//LINE - Android WebView v2 (correcao de inicializacao)

Este pacote substitui exclusivamente o projeto Android anterior. Ele NAO altera `index.html`, `admin.html`, `assets`, `src` ou o Supabase.

## Como atualizar

1. Extraia o ZIP.
2. Substitua a pasta `android/` e o arquivo `.github/workflows/beatline-android-apk.yml` na raiz do repositorio `Juliacsou/beatline`.
3. Faca commit e push. O GitHub Actions executara **BEATLINE - Gerar APK Android**.
4. Em **Actions**, abra a nova execucao com indicador verde. Em **Artifacts**, baixe `beatline-android-apk`.
5. Extraia `app-debug.apk`. No celular, desinstale o APK anterior se houver conflito de assinatura de teste; instale o novo.

## Correcao de compatibilidade

- Inicializacao de tela cheia apos montar a interface, com alternativa compativel com Android 7+.
- Falhas Java ao abrir WebView agora exibem uma tela nativa com orientacao para atualizar Android System WebView/Chrome.
- Recuperacao de falha do processo de renderizacao de WebView.
- Guardas em WebView durante pausa, retorno, orientacao e destruicao da tela.
- Captura de falhas inesperadas: apos o encerramento, abra o aplicativo outra vez para ver o diagnostico e usar **COPIAR DIAGNOSTICO**.
- Botao **ABRIR NO NAVEGADOR** se o WebView nativo estiver indisponivel.

## Se ainda fechar

Abra o app novamente. Se aparecer uma tela de erro, toque em **COPIAR DIAGNOSTICO** e envie o texto na conversa. Se continuar fechando sem mostrar essa tela, sera preciso obter o logcat do Android, pois pode ser uma falha nativa fora do alcance do capturador Java.

A versao continua usando GitHub Pages e nao embute a pagina ADM. O login nao e necessario. Todos os audios permanecem no Supabase.

**Aviso:** APKs debug gerados por runs diferentes do GitHub Actions podem ter chaves de assinatura diferentes. Isso exige desinstalar a versao de teste antiga para instalar a nova.
