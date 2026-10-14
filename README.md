# BEAT//LINE — Jogo musical

Projeto web (HTML, CSS e JavaScript), painel administrativo e aplicativo Android WebView. O catálogo e os arquivos MP3 continuam no Supabase existente; não é necessário criar tabelas novas para esta atualização.

## Atualização: reprodução, arraste e filtros

1. **A primeira faixa toca automaticamente** quando o jogador clica em **COMEÇAR**, do mesmo modo que as rodadas seguintes. Se o navegador bloquear a reprodução, o botão Play continua disponível.
2. **Barra de áudio interativa:** toque, clique ou arraste o controle de progresso para avançar ou voltar ao instante desejado. O marcador acompanha o tempo da reprodução.
3. **Cartão rosa reposicionável:** antes de pressionar **CONFIRMAR**, arraste o cartão rosa que está na linha do tempo para outro espaço. Também é possível soltar sobre a metade esquerda/direita de um cartão existente para escolher uma posição antes/depois. Os espaços continuam funcionando por toque/clique. A rolagem horizontal é preservada ao mudar a seleção.
4. **Filtros de partida:** escolha **INCLUIR** (verde) ou **EXCLUIR** (rosa) e toque nas categorias. Um segundo toque no mesmo modo desmarca. Categorias não selecionadas não restringem o catálogo. O botão **LIMPAR** remove todos os filtros.

### Como os filtros são combinados

As categorias aparecem automaticamente agrupadas por nome nas facetas **Origem**, **Época** e **Estilos e outras categorias**. A regra é **OU dentro de cada grupo**, **E entre grupos**, e **NÃO** para quaisquer categorias excluídas.

- **Internacional + Pop:** músicas que são internacionais **E** pop.
- **Pop + Anos 90:** músicas pop **E** dos anos 90.
- **Anos 90 + Anos 2000:** músicas dos anos 90 **OU** dos anos 2000.
- **Internacional + (Pop OU Rock) + (Anos 90 OU Anos 2000):** combinação de três facetas.
- **Excluir Nacional:** descarta qualquer música marcada com Nacional, inclusive se ela estiver em uma seleção de inclusão.

Os nomes de décadas/anos e nacionalidade são reconhecidos automaticamente. Outros nomes cadastrados entram no grupo *Estilos e outras categorias*. É importante que cada música do catálogo tenha as categorias de origem, época e estilo correspondentes para o filtro funcionar como esperado. Antes de começar a partida, a configuração mostra quantas músicas atendem aos critérios; ainda é necessária **1 música-base extra**. A leitura do catálogo foi paginada para não truncar listagens grandes no Supabase.

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

Foram também verificados em navegador Chromium, com músicas e áudios simulados, o início automático, busca temporal, mudança de posição do cartão rosa e confirmação de rodada. Teste também com seu catálogo Supabase e no dispositivo Android antes de publicar.

## Observação sobre Android

O APK Android usa WebView e carrega o jogo hospedado. As mudanças web entram no aplicativo quando a versão hospedada é atualizada. **Também ajustamos a configuração nativa do WebView** para liberar a reprodução sem exigir um segundo gesto; para aplicar essa alteração nativa, gere e instale um novo APK usando o workflow `.github/workflows/beatline-android-apk.yml`. O projeto mantém os arquivos de build e o workflow Android originais.
