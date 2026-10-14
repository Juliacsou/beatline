## Versao 8 — Cloudflare R2

- **Reproducao:** `https://audio.altigames.com.br/beatline/musicas/<file_path>`.
- **Upload/exclusao:** Cloudflare Worker `altigames-media-api`, autenticado com o token da conta administrativa Supabase.
- **Banco:** permanece no Supabase, mantendo o `file_path` original (UUID.mp3) das 269 musicas migradas. Nenhum SQL de migracao necessario.
- **Limite de upload:** 20 MB por arquivo no Worker; o painel mostra eventuais erros vindos da API.
- **Seguranca:** nao colocar credenciais R2 no GitHub; o Worker deve validar token e permissao `altigames_admins`.
- **Cuidado:** manter originais no Supabase Storage ate validar reproducao, cadastro, substituicao e exclusao.
- **Publicacao:** publicar todo o diretorio `beatline` no GitHub Pages; testar primeira partida e upload com arquivo autorizado antes de remover copias antigas.
- **Exclusao:** a remocao pelo painel atua no R2, nao apaga a copia antiga do Supabase Storage.

# BEAT//LINE — Jogo musical

Projeto web (HTML, CSS e JavaScript), painel administrativo e aplicativo Android WebView. O catálogo e a autenticação continuam no Supabase. Os MP3 são reproduzidos do Cloudflare R2 e gerenciados pelo Worker autenticado.

## Atualização V5: rolagem horizontal e músicas infinitas


### Novidades da V5

- **Rolar a timeline:** quando o cursor estiver sobre a linha do tempo, girar a roda vertical do mouse desloca a timeline horizontalmente (para a direita/para a esquerda). O gesto vertical de dois dedos do touchpad tem o mesmo efeito; o gesto horizontal de dois dedos continua usando o deslocamento horizontal nativo do navegador. A roda não altera o arraste do card rosa nem reposiciona a timeline automaticamente.
- **∞ MÚSICAS INFINITAS:** na configuração, ative essa opção para jogar sem limite de rodadas. O contador exibe `rodada / ∞`, e os controles do número de músicas ficam desabilitados enquanto o infinito estiver ativado.
- **Sem repetições prematuras:** cada faixa elegível aparece uma vez por ciclo; quando todas as músicas filtradas (incluindo a faixa-base da primeira rodada) já foram utilizadas, o conjunto é embaralhado de novo e o jogo continua. Na troca de ciclos, a última música tocada não é repetida imediatamente.
- **Regras independentes:** o jogador pode ter músicas infinitas e vidas limitadas, ou músicas e vidas infinitas ao mesmo tempo. Se houver vidas limitadas, a partida termina quando elas se esgotarem. Se ambas as opções forem infinitas, só termina ao sair da partida.
- **Seleção mínima:** músicas infinitas exigem pelo menos duas faixas elegíveis (uma base e uma para começar); os filtros de inclusão/exclusão continuam sendo respeitados a cada ciclo.

### Funcionalidades anteriores (preservadas)

1. **A primeira faixa toca automaticamente** quando o jogador clica em **COMEÇAR**, do mesmo modo que as rodadas seguintes. Se o navegador bloquear a reprodução, o botão Play continua disponível.
2. **Barra de áudio interativa:** toque, clique ou arraste o controle de progresso para avançar ou voltar ao instante desejado. O marcador acompanha o tempo da reprodução.
3. **Cartão rosa reposicionável:** antes de pressionar **CONFIRMAR**, arraste o cartão rosa que está na linha do tempo para outro espaço. Também é possível soltar sobre a metade esquerda/direita de um cartão existente para escolher uma posição antes/depois. Os espaços continuam funcionando por toque/clique. A rolagem horizontal é preservada ao mudar a seleção, inclusive quando a linha do tempo é longa: o cartão rosa pode ser arrastado sem fazer a tela saltar para o começo.
4. **Vidas:** defina qualquer quantidade inteira de vidas a partir de zero usando os botões **− / +** ou digitando diretamente no campo. Use **∞ VIDAS INFINITAS** para jogar sem perder vidas nem encerrar a partida por erros. Para voltar ao modo normal, desative o botão. Em partidas com mais de 8 vidas, o cabeçalho mostra um contador numérico no lugar de muitos ícones de coração.
5. **Filtros de partida:** escolha **INCLUIR** (verde) ou **EXCLUIR** (rosa) e toque nas categorias. Um segundo toque no mesmo modo desmarca. Categorias não selecionadas não restringem o catálogo. O botão **LIMPAR** remove todos os filtros.

### Como os filtros são combinados

As categorias aparecem automaticamente agrupadas por nome nas facetas **Origem**, **Época** e **Estilos e outras categorias**. A regra é **OU dentro de cada grupo**, **E entre grupos**, e **NÃO** para quaisquer categorias excluídas.

- **Internacional + Pop:** músicas que são internacionais **E** pop.
- **Pop + Anos 90:** músicas pop **E** dos anos 90.
- **Anos 90 + Anos 2000:** músicas dos anos 90 **OU** dos anos 2000.
- **Internacional + (Pop OU Rock) + (Anos 90 OU Anos 2000):** combinação de três facetas.
- **Excluir Nacional:** descarta qualquer música marcada com Nacional, inclusive se ela estiver em uma seleção de inclusão.

Os nomes de décadas/anos e nacionalidade são reconhecidos automaticamente. Outros nomes cadastrados entram no grupo *Estilos e outras categorias*. É importante que cada música do catálogo tenha as categorias de origem, época e estilo correspondentes para o filtro funcionar como esperado. Antes de começar a partida, a configuração mostra quantas músicas atendem aos critérios. Em partidas com número definido, ainda é necessária **1 música-base extra**; no modo infinito, são necessárias **pelo menos 2 músicas elegíveis**. A leitura do catálogo foi paginada para não truncar listagens grandes no Supabase.

## Como executar

Abra `index.html` no navegador ou hospede os arquivos web em um servidor estático (incluindo `src/filters.js`). O catálogo usa a configuração já existente em `src/config.js`.

- `index.html`: jogo.
- `admin.html`: painel de músicas/categorias.
- `assets/style.css`: apresentação visual.
- `src/app.js`: interface e mecânicas.
- `src/filters.js`: regras puras de categorização, inclusões e exclusões.
- `src/supabase.js`: operações de banco de dados e Storage.
- `android/`: aplicativo Android que abre a versão web.

### Testes de regras de filtragem

Com Node.js instalado, execute:

```bash
node --test tests/filters.test.cjs
```

Na V5 também foram testados no Chromium: roda vertical do mouse, gesto horizontal do touchpad, reposicionamento do cartão rosa mantendo o scroll, partida com 28 rodadas sem encerramento automático, esgotamento e reciclagem do catálogo sem repetição antecipada, modo infinito com filtros, interação entre vidas/músicas infinitas e regressão do modo finito.

Nas versões anteriores, foram também verificados em navegador Chromium, com músicas e áudios simulados, o início automático, busca temporal, arraste do cartão rosa em ambos os sentidos sem alterar a rolagem da timeline longa (mouse e toque), reposicionamento do cartão de origem, contador de 200 vidas, modo infinito, perda de vidas no modo normal, e a regra anterior de zero vidas. Teste também com seu catálogo Supabase e no dispositivo Android antes de publicar.

## Observação sobre Android

O APK Android usa WebView e carrega o jogo hospedado. As mudanças web entram no aplicativo quando a versão hospedada é atualizada. **Também ajustamos a configuração nativa do WebView** para liberar a reprodução sem exigir um segundo gesto; para aplicar essa alteração nativa, gere e instale um novo APK usando o workflow `.github/workflows/beatline-android-apk.yml`. O projeto mantém os arquivos de build e o workflow Android originais.

### Ajuste visual V6
- Botoes de aumentar/diminuir e opcoes infinitas dos paineis de musicas e vidas agora compartilham as mesmas alturas e linhas de layout (desktop e mobile).


## Atualização V7: login administrativo unificado da AltiGames

- `admin.html` usa Supabase Auth (e-mail/senha) e verifica `public.is_altigames_admin()` antes de exibir o painel.
- O mesmo usuário e senha do Supabase Auth serve para outros jogos no mesmo projeto. Sessões continuam separadas por origem no navegador.
- Requisições de escrita ao Supabase REST e Storage enviam o JWT autenticado, renovado automaticamente quando necessário.
- `index.html` e partidas continuam públicos, sem login.
- A versão mantém os MP3 no Supabase Storage. A migração dos arquivos para o R2 é uma etapa separada; não altere caminhos de arquivos ainda.
- **Atenção:** as políticas RLS antigas com `ALL TO anon USING (true)` precisam ser removidas **após testar** esta versão (instruções SQL fornecidas no chat), ou as APIs continuarão aceitando escritas anônimas. Não é seguro só esconder o painel com login.
- A API do R2 para uploads e exclusões também deverá validar o JWT e a permissão de administrador quando for implementada.
