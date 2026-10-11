# BEAT//LINE — v5

Jogo musical para um único dispositivo. A playlist, as categorias e todos os arquivos MP3 vêm exclusivamente do Supabase.

## Abrir

- `index.html`: jogo.
- `admin.html`: painel de administração de músicas e categorias (acesso somente por URL direta; sem botão na Home).
- O ícone da logo rosa é usado como favicon nas duas páginas.
- Extraia o ZIP completo; mantenha as pastas `src` e `assets`.
- Se o navegador bloquear requisições de páginas abertas com `file://`, sirva a pasta com `python -m http.server 8000` e abra `http://localhost:8000` e `http://localhost:8000/admin.html`.

## Supabase

As configurações públicas da conexão são fixas em `src/config.js`. Não existe formulário para alterá-las. O esquema utilizado é `beatline_categories`, `beatline_tracks`, `beatline_track_categories` e o bucket público `beatline-music`. As tabelas e políticas devem existir no Supabase.

A página ADM permite cadastrar, editar e excluir músicas (upload/substituição de MP3) e categorias (associação de várias categorias por música). O jogo lê os dados do mesmo projeto.

## Publicação e segurança

**Não há login, conforme solicitado.** As permissões anônimas de escrita do Supabase atualmente permitem que qualquer pessoa que acesse a API pública altere ou exclua dados e arquivos. Publicar o repositório no GitHub não equivale a proteger o banco. Antes de disponibilizar a aplicação em uma URL pública, revise o acesso à ADM e as políticas RLS/Storage, sem precisar necessariamente adicionar login à interface.

Nunca inclua chaves `service_role` ou `sb_secret_*` no frontend. Não armazene MP3s no repositório.

O SQL de manutenção é fornecido separadamente no chat conforme as instruções do projeto.
