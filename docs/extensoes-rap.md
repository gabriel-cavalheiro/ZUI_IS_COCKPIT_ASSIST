# Documentacao das Extensoes RAP

## 1. Visao geral

Este app foi gerado como uma aplicacao SAP Fiori Elements V4 sobre um servico OData V4 RAP.
As extensoes implementadas no frontend estao concentradas na Object Page do entity set `Cockpit`
e adicionam comportamentos que nao fazem parte do floorplan padrao.

Escopo atual das extensoes:

- acao customizada `Estoque Material`
- acao customizada `Vendas Ult. Meses`
- dialog customizado para consulta de estoque
- dialog customizado para consulta de vendas
- value help customizado de material dentro do dialog de estoque
- tratamento de draft para desabilitar acoes em rascunho
- ajustes visuais locais para o `IconTabBar` do dialog de estoque


## 2. Arquitetura tecnica

### 2.1 Registro da extensao

A extensao de controller da Object Page esta registrada no `manifest.json` via:

- `sap.ui5.extends.extensions.sap.ui.controllerExtensions`
- controller: `br.com.gamma.zuiiscockpitassist.ext.controller.Cockpitpopup`

Arquivo principal:

- `webapp/manifest.json`

Arquivos da extensao:

- `webapp/ext/controller/Cockpitpopup.js`
- `webapp/ext/controller/Cockpitpopup.controller.js`

Observacao:

- o arquivo `Cockpitpopup.controller.js` existe como wrapper para atender o carregamento esperado pelo runtime UI5 quando a extensao e resolvida como controller


### 2.2 Extensoes visuais

Dialogs e fragments customizados:

- `webapp/ext/fragment/EstoqueMaterialDialog.fragment.xml`
- `webapp/ext/fragment/VendasUltMesesDialog.fragment.xml`

CSS local carregado pelo app:

- `webapp/css/style.css`

Recursos i18n usados pelas extensoes:

- `webapp/i18n/i18n.properties`


## 3. Acao customizada: Estoque Material

### 3.1 Objetivo funcional

Permitir que o usuario consulte o estoque de um material a partir da Object Page, incluindo:

- material consultado
- materiais relacionados
- preco de condicao retornado pelo backend

### 3.2 Onde esta configurada

No header da Object Page em:

- `webapp/manifest.json`

Configuracao principal:

- action id: `EstoqueMaterials`
- handler: `.extension.br.com.gamma.zuiiscockpitassist.ext.controller.Cockpitpopup.onAbrirEstoqueMaterial`

### 3.3 Comportamento

Ao clicar na acao:

1. o controller captura o contexto atual do cliente
2. valida se o objeto nao esta em draft
3. abre o fragment `EstoqueMaterialDialog`
4. o usuario informa ou seleciona um material
5. ao buscar, o frontend consome o entity set `EstoqueMaterial`
6. o retorno e separado em duas abas:
   - `Material Consultado`
   - `Materiais Relacionados`

### 3.4 Backend consumido

Entity set utilizado:

- `EstoqueMaterial`

Filtros enviados pelo frontend:

- `Material`
- `CompanyCode`
- `Customer`

Campos relevantes usados no frontend:

- `Material`
- `MaterialDescription`
- `Plant`
- `PlantName`
- `EstoqueDisponivel`
- `BaseUnit`
- `PrecoCondicao`
- `ConditionCurrency`
- `TipoMaterial`

### 3.5 Arquivos envolvidos

- `webapp/ext/controller/Cockpitpopup.js`
- `webapp/ext/fragment/EstoqueMaterialDialog.fragment.xml`
- `webapp/i18n/i18n.properties`
- `webapp/css/style.css`


## 4. Value Help de material

### 4.1 Objetivo funcional

Facilitar a selecao do material no dialog de estoque sem exigir digitacao manual do codigo.

### 4.2 Implementacao

O value help e implementado no metodo:

- `onMaterialValueHelpDialog`

Ele abre um `sap.m.SelectDialog` e usa o entity set:

- `Produtos`

### 4.3 Regras aplicadas

- filtro fixo por idioma SAP: `Language = 'P'`
- busca por:
  - `Product`
  - `ProductDescription`
- retorno exibido com:
  - titulo = `Product`
  - descricao = `ProductDescription`

### 4.4 Motivacao da mudanca

Inicialmente o value help estava apontando para um caminho antigo. Depois da exposicao da CDS de produtos no metadata, o frontend passou a consumir diretamente:

- `Produtos`

Isso alinhou o dialog com o metadata atual do servico RAP.


## 5. Acao customizada: Vendas Ult. Meses

### 5.1 Objetivo funcional

Permitir que o usuario visualize o historico agregado de vendas do cliente nos ultimos 12 meses.

### 5.2 Onde esta configurada

No header da Object Page em:

- `webapp/manifest.json`

Configuracao principal:

- action id: `VendaUltMeses`
- handler: `.extension.br.com.gamma.zuiiscockpitassist.ext.controller.Cockpitpopup.onAbrirVendasUltMeses`

### 5.3 Comportamento

Ao clicar na acao:

1. o controller captura o cliente do contexto atual
2. valida se o objeto nao esta em draft
3. abre o fragment `VendasUltMesesDialog`
4. carrega automaticamente os dados do backend
5. permite filtro local por material ou descricao

### 5.4 Backend consumido

Entity set utilizado:

- `VendasUltimosMeses`

Filtro enviado pelo frontend:

- `SoldToParty = Customer`

Campos relevantes usados no frontend:

- `Material`
- `MaterialDescription`
- `AnoMes`
- `QtdFaturada`
- `BillingQuantityUnit`
- `ValorLiquido`
- `TransactionCurrency`
- `QtdDocumentos`

### 5.5 Recursos adicionais

- totalizacao de documentos
- totalizacao de valor liquido
- busca local no dialog via `SearchField`

### 5.6 Arquivos envolvidos

- `webapp/ext/controller/Cockpitpopup.js`
- `webapp/ext/fragment/VendasUltMesesDialog.fragment.xml`
- `webapp/i18n/i18n.properties`


## 6. Tratamento de draft

As duas acoes customizadas foram preparadas para nao operar enquanto o objeto esta em rascunho.

### 6.1 Regra visual

No `manifest.json`, as acoes usam:

- `enabled: "{= %{IsActiveEntity} === true }"`

Isso faz com que os botoes fiquem desabilitados quando:

- `IsActiveEntity = false`

### 6.2 Regra defensiva no controller

Mesmo com a regra visual, existe validacao adicional no controller:

- helper `_isDraftContext`
- bloqueio nos metodos:
  - `onAbrirEstoqueMaterial`
  - `onAbrirVendasUltMeses`

Se houver tentativa de abrir em draft por cache antigo ou chamada indevida, o frontend mostra mensagem e nao segue com o fluxo.


## 7. Ajustes de UX no dialog de estoque

Foi incluido CSS local para ajustar o `IconTabBar` do dialog de estoque.

Objetivo:

- melhorar a leitura das abas
- reduzir truncamento do texto
- controlar melhor a largura visual das tabs

Arquivo:

- `webapp/css/style.css`

Observacao:

- como o `IconTabBar` do UI5 aplica estilos proprios por tema, esse arquivo deve ser tratado como ajuste fino de UX, nao como regra funcional


## 8. Dependencias de backend relevantes

As extensoes frontend dependem da exposicao correta no servico RAP dos seguintes entity sets:

- `Cockpit`
- `EstoqueMaterial`
- `VendasUltimosMeses`
- `Produtos`

Campos importantes para o frontend:

- `Customer`
- `CompanyCode` ou `Companycode` conforme exposicao do servico
- `CustomerName`
- `IsActiveEntity`

Observacao importante:

- o frontend assume que o servico RAP esta draft-enabled e que `IsActiveEntity` e retornado no contexto da Object Page


## 9. Fora do escopo atual

Atualmente nao fazem parte do escopo ativo do frontend:

- dialog de `Titulos Vencidos` removido da camada UI

A decisao foi deixar essa logica para o backend.


## 10. Guia rapido de manutencao

### Se precisar alterar uma acao do header

Verificar:

- `webapp/manifest.json`
- `webapp/ext/controller/Cockpitpopup.js`

### Se precisar alterar layout ou campos do dialog de estoque

Verificar:

- `webapp/ext/fragment/EstoqueMaterialDialog.fragment.xml`
- `webapp/ext/controller/Cockpitpopup.js`
- `webapp/css/style.css`
- `webapp/i18n/i18n.properties`

### Se precisar alterar layout ou campos do dialog de vendas

Verificar:

- `webapp/ext/fragment/VendasUltMesesDialog.fragment.xml`
- `webapp/ext/controller/Cockpitpopup.js`
- `webapp/i18n/i18n.properties`

### Se o value help de material parar de funcionar

Conferir:

- entity set `Produtos` no metadata
- campos `Product`, `ProductDescription`, `Language`
- metodo `onMaterialValueHelpDialog`
- helper `_getMaterialValueHelpFilters`


## 11. Resumo executivo

As extensoes implementadas neste app RAP adicionam duas consultas operacionais na Object Page:

- consulta de estoque por material
- consulta de vendas por cliente

Essas extensoes foram construidas com:

- controller extension de Fiori Elements V4
- fragments customizados
- consumo de entity sets RAP via OData V4
- comportamento seguro para draft
- value help customizado para material
- pequenos ajustes de UX via CSS
