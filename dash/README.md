# 🐾 Amor de Patas — Dashboard de Marketing

Dashboard fullscreen em HTML, CSS, JavaScript e Bootstrap 5, com paleta de
cores da marca Amor de Patas (marrom/dourado/creme), gráficos interativos
com filtros e o funil de marketing em destaque.

## Como abrir

1. Descompacte o arquivo `.zip`.
2. Dê duplo clique em **`index.html`** (funciona 100% offline — todas as
   bibliotecas, Bootstrap e Chart.js, estão incluídas na pasta
   `assets/vendor`, sem necessidade de internet).
3. Use o botão **⛶ Tela cheia** no cabeçalho para o modo apresentação.

## Estrutura de arquivos

```
amor-de-patas-dashboard/
├── index.html              → página principal do dashboard
├── assets/
│   ├── style.css            → paleta de cores, layout e responsividade
│   ├── data.js               → base sintética de 300 leads
│   ├── app.js                 → filtros, KPIs, funil e gráficos (Chart.js)
│   └── vendor/                → Bootstrap 5 e Chart.js (uso offline)
└── README.md                → este arquivo
```

## O que o dashboard mostra

- **KPIs**: total de leads, MQL, consentimento (LGPD) e aceite de novidades.
- **Funil de marketing** (em destaque): Leads totais → Consentimento →
  MQL qualificado → Aceita novidades, com taxa de conversão e queda entre
  etapas, recalculado a cada filtro.
- **7 filtros combináveis**: origem, bairro, espécie, interesse inicial,
  MQL, consentimento, aceita novidades e tutores com mais de 1 pet — todos
  os gráficos, KPIs e o funil se atualizam juntos.
- **6 gráficos**: origem dos leads, perfil de espécie dos pets, interesse
  inicial, principais bairros, qualificação (MQL) por origem e tutores com
  mais de 1 pet (oportunidade de cross-sell).
- **Tabela de dados** por gráfico ("Ver tabela") e uma tabela detalhada de
  todos os leads filtrados — garante que todo valor também esteja acessível
  sem depender só do gráfico (acessibilidade).
- **Modo claro/escuro** e emojis temáticos em toda a interface.

## Sobre os dados

A planilha original ("LEADS 300") fornecida contém apenas os **agregados**
por categoria (ex.: Instagram = 136 leads, Cachorro = 214, etc.), sem a
base linha a linha. Para que os filtros funcionem de verdade — cruzando
origem × bairro × espécie × MQL etc. — foi gerada uma base sintética de
300 leads que **reproduz exatamente as mesmas contagens agregadas** do
dashboard original em cada dimensão individual (mesmos totais por origem,
espécie, interesse, bairro, MQL, consentimento, aceita novidades e
multi-pet). As combinações entre colunas são uma simulação (embaralhamento
aleatório com semente fixa) e servem para demonstrar a experiência completa
de filtragem — quando a base real linha a linha estiver disponível, basta
substituir o conteúdo de `assets/data.js` pelos dados reais no mesmo
formato.

## Paleta de cores

- **Identidade da marca** (cabeçalho, botões, funil, destaques): tons de
  marrom (`#241509` → `#8B5A34`) e dourado (`#A6780F` → `#DDAE4E`) sobre
  fundo creme (`#F3ECDD`), inspirados no dashboard e no e-mail de
  confirmação da Amor de Patas.
- **Cores dos gráficos**: paleta categórica validada para contraste e
  daltonismo (protanopia/deuteranopia), com rótulos diretos nas barras e
  tabela de apoio — assim nenhuma informação depende só da cor.
