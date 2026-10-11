# BEAT//LINE — v6

Jogo musical para um único dispositivo. A playlist, as categorias e todos os arquivos MP3 vêm exclusivamente do Supabase.

## Abrir

- `index.html`: jogo.
- `admin.html`: painel de administração de músicas e categorias (acesso somente por URL direta; sem botão na Home).
- O ícone da logo rosa é usado como favicon nas duas páginas.
- Extraia o ZIP completo; mantenha as pastas `src` e `assets`.
- Se o navegador bloquear requisições de páginas abertas com `file://`, sirva a pasta com `python -m http.server 8000` e abra `http://localhost:8000` e `http://localhost:8000/admin.html`.

## Supabase

As configurações públicas da conexão são fixas em `src/config.js`. Não existe formulário para alterá-las. O esquema utilizado é `beatline_categories`, `beatline_tracks`, `beatline_track_categories` e o bucket público `beatline-music`. As tabelas e políticas devem existir no Supabase.

A página ADM permite cadastrar, editar e excluir músicas (upload/substituição de MP3) e categorias (associação de várias categorias por música). A aba **Importar em lote** aceita MP3s, uma pasta (em navegadores compatíveis) e ZIPs com MP3s, mostra uma prévia editável, cadastra novas categorias automaticamente, evita duplicados por título/artista/ano e permite editar/excluir as músicas importadas. O jogo lê os dados do mesmo projeto.

## Publicação e segurança

**Não há login, conforme solicitado.** As permissões anônimas de escrita do Supabase atualmente permitem que qualquer pessoa que acesse a API pública altere ou exclua dados e arquivos. Publicar o repositório no GitHub não equivale a proteger o banco. Antes de disponibilizar a aplicação em uma URL pública, revise o acesso à ADM e as políticas RLS/Storage, sem precisar necessariamente adicionar login à interface.

Nunca inclua chaves `service_role` ou `sb_secret_*` no frontend. Não armazene MP3s no repositório.

O SQL de manutenção é fornecido separadamente no chat conforme as instruções do projeto.

## Importação em lote

Formato de arquivo: `nomemusica-nomeartista-ano-categoria1-categoria2.mp3`.

- Separador obrigatório: hífen simples (`-`). Sem limite fixo de categorias. Não inclua hífens nos campos; se necessário, ajuste a prévia antes de cadastrar.
- Categorias no nome dos arquivos são normalizadas em maiúsculas. Nomes de categorias existentes são reutilizados; os novos são criados automaticamente. Cada nome de categoria pode ter até 40 caracteres na interface.
- É possível selecionar vários MP3s, arrastar arquivos, escolher uma pasta (Chrome/Opera ou outro navegador que suporte `webkitdirectory`) ou enviar ZIPs. O pacote JSZip está incluído localmente para leitura dos ZIPs.
- Limites técnicos: cada MP3 deve ter no máximo 20 MiB (limite do bucket); por seleção, ZIPs aceitam no máximo 500 MiB de áudio descompactado para evitar travamentos. Você pode fazer diversas importações.
- Músicas repetidas por título + artista + ano são identificadas e não enviadas; revise os itens sinalizados. Importações são sequenciais e exibem progresso e erros por item.
- Após enviar, a lista permite ajustar metadados e categorias ou excluir músicas já cadastradas. O botão **Limpar lista** remove só o histórico da importação da tela, nunca os dados enviados.
- Se o navegador for fechado durante uma importação, consulte a aba Músicas antes de reenviar para evitar duplicações.
- O leitor JSZip (MIT/GPLv3) foi incluído em `src/jszip.min.js` e a respectiva licença em `src/JSZIP-LICENSE.md`.
