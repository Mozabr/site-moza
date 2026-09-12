# mozabr.com.br

Site institucional da Moza. HTML e CSS estáticos, **sem framework e sem etapa
de build**: a pasta `public/` é literalmente o que vai para o ar.

## Rodar local

```bash
bash ferramentas/servir.sh          # site em http://localhost:4321
bash ferramentas/servir.sh parar
```

## Publicar

O deploy é pela **Vercel**, conectada a este repositório: todo push na `main`
sobe sozinho. A configuração está em `vercel.json` e não precisa de build.

### Primeira conexão (uma vez só)

1. Entrar em [vercel.com/new](https://vercel.com/new) com a conta da Moza.
2. **Import Git Repository**, escolher `Mozabr/site-moza`. Se o repositório não
   aparecer, clicar em *Adjust GitHub App Permissions* e liberar o acesso: ele
   é privado.
3. Não mexer em nada na tela de configuração. O `vercel.json` já diz que não há
   build e que a pasta servida é `public/`.
4. **Deploy**.

### Ligar o domínio

O `mozabr.com.br` está hoje **estacionado na Hostinger** (nameservers
`dns-parking.com`), sem site no ar. Para apontar para a Vercel:

1. No projeto da Vercel: *Settings, Domains*, adicionar `mozabr.com.br` e
   `www.mozabr.com.br`.
2. A Vercel mostra os registros. No painel da Hostinger, em *DNS Zone*, criar:
   - `A` do `@` para o IP que a Vercel indicar
   - `CNAME` do `www` para `cname.vercel-dns.com`
3. Deixar o `www` redirecionando para o domínio sem `www`, que é o padrão da
   Vercel e o que o site espera.

Propagação leva de minutos a algumas horas.

## Atenção

- `public/.htaccess` é de servidor **Apache** e não faz nada na Vercel. Ele fica
  para o caso de a hospedagem voltar para a Hostinger. Quem manda na Vercel é o
  `vercel.json`.
- Depois de trocar imagem nas pastas de origem, rodar
  `bash ferramentas/imagens.sh` e `bash ferramentas/portfolio.sh`.
- Antes de qualquer push, rodar o QA:

```bash
node ferramentas/qa.mjs public/index.html
```

Regras do projeto, decisões de marca e as armadilhas já pagas estão em
`CLAUDE.md`.
