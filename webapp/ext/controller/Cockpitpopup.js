// ============================================================
// Alt 3 FINAL: Controller Extension - Dois Popups
//
// Botão "Estoque Material"     → abre EstoqueMaterialDialog
// Botão "Vendas Últimos Meses" → abre VendasUltMesesDialog
//
// Ambos fiéis à EF:
//   - Estoque: usuário digita material → busca estoque + preço PPR0
//   - Vendas:  carrega automaticamente ao abrir (cliente já selecionado)
//
// Arquivo: webapp/ext/controller/CockpitPopupExtension.controller.js
// ============================================================
sap.ui.define([
    "sap/ui/core/mvc/ControllerExtension",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (ControllerExtension, Fragment, JSONModel, Filter, FilterOperator, MessageToast, MessageBox) {
    "use strict";

    return ControllerExtension.extend("br.com.gamma.zuiiscockpitassist.ext.controller.Cockpitpopup", {

        metadata: {
            methods: {
                onAbrirEstoqueMaterial:         { public: true, final: false },
                onAbrirVendasUltMeses:          { public: true, final: false },
                onBuscarEstoqueDialog:          { public: true, final: false },
                onMaterialValueHelpDialog:      { public: true, final: false },
                onFecharEstoqueDialog:          { public: true, final: false },
                onFilterVendasDialog:           { public: true, final: false },
                onFecharVendasDialog:           { public: true, final: false },
                onAbrirTitulosVencidos:         { public: true, final: false },
                onFecharTitulosVencidosDialog:  { public: true, final: false }
            }
        },

        // ================================================================
        // Helpers: captura dados do cliente a partir do binding context
        // ================================================================

        /**
         * Extrai Customer, CompanyCode e CustomerName do contexto atual
         * @returns {boolean} true se contexto válido
         */
        _captureClienteContext: function () {
            var oCtx = this.base.getView().getBindingContext();
            if (!oCtx) {
                MessageBox.warning("Selecione um cliente primeiro.");
                return false;
            }
            this._sCustomer = oCtx.getProperty("Customer");
            this._sCompanyCode = oCtx.getProperty("CompanyCode");
            this._sCustomerName = oCtx.getProperty("CustomerName");
            return true;
        },

        // ================================================================
        //  POPUP 1: ESTOQUE MATERIAL  (EF Seção 2.1.3)
        // ================================================================
        //
        //  Fluxo:
        //    1. Usuário clica no botão "Estoque Material"
        //    2. Abre Dialog com campo de busca (match code de material)
        //    3. Usuário seleciona/digita material e clica "Buscar"
        //    4. Controller chama entity set EstoqueMaterial via OData V4
        //    5. Backend (ZCL_CE_VSD_ESTOQUE_MAT) executa:
        //       - SELECT_01: busca materiais relacionados em ZVSD_PROD_REL
        //       - SELECT_02: busca estoque em I_MaterialStock
        //       - SELECT_03/04: busca preço PPR0 em I_SlsPrcgConditionRecord
        //    6. Retorno split em tabs: "Consultado" vs "Relacionado"
        //
        // ================================================================

        /**
         * Custom Action: Abre o dialog de Estoque Material
         */
        onAbrirEstoqueMaterial: function () {
            if (!this._captureClienteContext()) { return; }

            // Modelo local JSON para alimentar as tabelas do dialog
            if (!this._oEstoqueModel) {
                this._oEstoqueModel = new JSONModel({
                    consultado: [],
                    relacionado: [],
                    countConsultado: 0,
                    countRelacionado: 0,
                    loading: false
                });
            }

            var that = this;
            var oView = this.base.getView();

            if (!this._oEstoqueDialog) {
                // Carrega o fragment na primeira vez
                Fragment.load({
                    id: oView.getId(),
                    name: "br.com.gamma.zuiiscockpitassist.ext.fragment.EstoqueMaterialDialog",
                    controller: this
                }).then(function (oDialog) {
                    that._oEstoqueDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.setModel(that._oEstoqueModel, "dlgEstoque");
                    oDialog.open();
                });
            } else {
                // Limpa dados anteriores e reabre
                this._oEstoqueModel.setData({
                    consultado: [], relacionado: [],
                    countConsultado: 0, countRelacionado: 0,
                    loading: false
                });
                // Limpa campo de input
                var oInput = Fragment.byId(oView.getId(), "dlgInputMaterial");
                if (oInput) { oInput.setValue(""); }
                this._oEstoqueDialog.open();
            }
        },

        /**
         * Handler: Buscar estoque quando usuário clica "Buscar" ou dá Enter
         */
        onBuscarEstoqueDialog: function () {
            var oView = this.base.getView();
            var oInput = Fragment.byId(oView.getId(), "dlgInputMaterial");
            var sMaterial = oInput ? oInput.getValue().trim() : "";

            if (!sMaterial) {
                MessageToast.show("Informe o código do material");
                return;
            }

            this._fetchEstoqueData(sMaterial);
        },

        /**
         * Busca dados de estoque via OData V4 list binding
         * @param {string} sMaterial - Código do material
         */
        _fetchEstoqueData: function (sMaterial) {
            var that = this;
            var oModel = this.base.getView().getModel();

            this._oEstoqueModel.setProperty("/loading", true);

            // Monta filtros conforme EF: Material + CompanyCode + Customer
            var aFilters = [
                new Filter("Material", FilterOperator.EQ, sMaterial)
            ];
            if (this._sCompanyCode) {
                aFilters.push(
                    new Filter("CompanyCode", FilterOperator.EQ, this._sCompanyCode)
                );
            }
            if (this._sCustomer) {
                aFilters.push(
                    new Filter("Customer", FilterOperator.EQ, this._sCustomer)
                );
            }

            // Cria list binding temporário para buscar dados
            var oListBinding = oModel.bindList(
                "/EstoqueMaterial",   // entity set da Custom Entity
                undefined,            // sem contexto pai
                undefined,            // sem sorter
                aFilters              // filtros
            );

            oListBinding.requestContexts(0, 999).then(function (aContexts) {
                var aConsultado = [];
                var aRelacionado = [];

                aContexts.forEach(function (oCtx) {
                    var oData = oCtx.getObject();
                    if (oData.TipoMaterial === "Consultado") {
                        aConsultado.push(oData);
                    } else {
                        aRelacionado.push(oData);
                    }
                });

                that._oEstoqueModel.setData({
                    consultado: aConsultado,
                    relacionado: aRelacionado,
                    countConsultado: aConsultado.length,
                    countRelacionado: aRelacionado.length,
                    loading: false
                });

                if (aConsultado.length === 0 && aRelacionado.length === 0) {
                    MessageToast.show("Nenhum estoque encontrado para " + sMaterial);
                }

            }).catch(function (oError) {
                that._oEstoqueModel.setProperty("/loading", false);
                MessageBox.error("Erro ao buscar estoque: " + (oError.message || oError));
            });
        },

        /**
         * Handler: Value Help para seleção de material (match code)
         * Conforme EF 2.1.3: "exibir lista de materiais quando Language = P"
         */
        onMaterialValueHelpDialog: function (oEvent) {
            var oSource = oEvent.getSource();
            var oView = this.base.getView();

            if (!this._oMatVHDialog) {
                this._oMatVHDialog = new sap.m.SelectDialog({
                    title: "Selecionar Material",
                    noDataText: "Nenhum material encontrado",
                    growing: true,
                    growingThreshold: 50,
                    items: {
                        path: "/ProductDescription",
                        filters: [
                            new Filter("Language", FilterOperator.EQ, "P")
                        ],
                        sorter: new sap.ui.model.Sorter("Product"),
                        template: new sap.m.StandardListItem({
                            title: "{Product}",
                            description: "{ProductDescription}",
                            icon: "sap-icon://product"
                        })
                    },
                    confirm: function (oEvt) {
                        var oItem = oEvt.getParameter("selectedItem");
                        if (oItem) {
                            oSource.setValue(oItem.getTitle());
                        }
                    },
                    liveChange: function (oEvt) {
                        var sValue = oEvt.getParameter("value");
                        oEvt.getSource().getBinding("items").filter([
                            new Filter({
                                filters: [
                                    new Filter("Product", FilterOperator.Contains, sValue),
                                    new Filter("ProductDescription", FilterOperator.Contains, sValue)
                                ],
                                and: false
                            })
                        ]);
                    }
                });
                oView.addDependent(this._oMatVHDialog);
            }
            this._oMatVHDialog.open("");
        },

        /**
         * Handler: Fechar dialog de estoque
         */
        onFecharEstoqueDialog: function () {
            if (this._oEstoqueDialog) {
                this._oEstoqueDialog.close();
            }
        },


        // ================================================================
        //  POPUP 2: VENDAS ÚLTIMOS 12 MESES  (EF Seção 2.1.5)
        // ================================================================
        //
        //  Fluxo:
        //    1. Usuário insere código do cliente e clica "Vendas Últ. Meses"
        //    2. Abre Dialog com tabela de vendas
        //    3. Controller chama entity set VendasUltimosMeses via OData V4
        //    4. Backend (ZCL_CE_VSD_VENDAS_ULT) executa:
        //       - SELECT_1: itens faturados (I_BillingDocumentItem)
        //       - SELECT_2: descrições (I_ProductDescription_2, Language = P)
        //       - Agrega por Material + AnoMes
        //    5. Retorno exibido como tabela no dialog
        //
        // ================================================================

        /**
         * Custom Action: Abre o dialog de Vendas
         */
        onAbrirVendasUltMeses: function () {
            if (!this._captureClienteContext()) { return; }

            // Modelo local JSON
            if (!this._oVendasModel) {
                this._oVendasModel = new JSONModel({
                    items: [],
                    allItems: [],     // backup para filtro local
                    customerName: "",
                    totalDocs: 0,
                    totalValor: 0,
                    loading: false
                });
            }

            var that = this;
            var oView = this.base.getView();

            if (!this._oVendasDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "br.com.gamma.zuiiscockpitassist.ext.fragment.VendasUltMesesDialog",
                    controller: this
                }).then(function (oDialog) {
                    that._oVendasDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.setModel(that._oVendasModel, "dlgVendas");
                    // Carrega dados automaticamente ao abrir
                    that._fetchVendasData();
                    oDialog.open();
                });
            } else {
                // Recarrega dados para o cliente atual
                this._fetchVendasData();
                this._oVendasDialog.open();
            }
        },

        /**
         * Busca dados de vendas via OData V4
         */
        _fetchVendasData: function () {
            var that = this;
            var oModel = this.base.getView().getModel();

            this._oVendasModel.setProperty("/loading", true);
            this._oVendasModel.setProperty("/customerName", this._sCustomerName || this._sCustomer);

            var oListBinding = oModel.bindList(
                "/VendasUltimosMeses",
                undefined,
                undefined,
                [new Filter("SoldToParty", FilterOperator.EQ, this._sCustomer)]
            );

            oListBinding.requestContexts(0, 9999).then(function (aContexts) {
                var aItems = aContexts.map(function (oCtx) {
                    return oCtx.getObject();
                });

                // Totaliza
                var iTotalDocs = 0;
                var fTotalValor = 0;
                aItems.forEach(function (item) {
                    iTotalDocs += (item.QtdDocumentos || 0);
                    fTotalValor += parseFloat(item.ValorLiquido || 0);
                });

                that._oVendasModel.setData({
                    items: aItems,
                    allItems: aItems,
                    customerName: that._sCustomerName || that._sCustomer,
                    totalDocs: iTotalDocs,
                    totalValor: fTotalValor.toFixed(2),
                    loading: false
                });

                if (aItems.length === 0) {
                    MessageToast.show(
                        "Nenhuma venda nos últimos 12 meses para o cliente " + that._sCustomer
                    );
                }

            }).catch(function (oError) {
                that._oVendasModel.setProperty("/loading", false);
                MessageBox.error("Erro ao buscar vendas: " + (oError.message || oError));
            });
        },

        /**
         * Handler: Filtro local na tabela de vendas (SearchField)
         */
        onFilterVendasDialog: function (oEvent) {
            var sQuery = (oEvent.getParameter("newValue") || "").toLowerCase();
            var aAllItems = this._oVendasModel.getProperty("/allItems") || [];

            if (!sQuery) {
                this._oVendasModel.setProperty("/items", aAllItems);
            } else {
                var aFiltered = aAllItems.filter(function (item) {
                    return (item.Material && item.Material.toLowerCase().indexOf(sQuery) > -1) ||
                        (item.MaterialDescription && item.MaterialDescription.toLowerCase().indexOf(sQuery) > -1);
                });
                this._oVendasModel.setProperty("/items", aFiltered);
            }
        },

        /**
         * Handler: Fechar dialog de vendas
         */
        onFecharVendasDialog: function () {
            if (this._oVendasDialog) {
                this._oVendasDialog.close();
            }
        },

        // ================================================================
        //  SEÇÃO: ITENS DO PEDIDO
        // ================================================================
        //
        //  Carregado automaticamente via override.routing.onAfterBinding
        //  quando a ObjectPage faz o bind do registro Cockpit.
        //  Filtra ItemsPO pelo campo Pedido do registro atual.
        //
        // ================================================================

        /**
         * Lifecycle override: carrega dados da seção assim que o binding está pronto
         */
        override: {
            routing: {
                onAfterBinding: function (oBindingContext) {
                    if (!oBindingContext) { return; }

                    var sPedido = oBindingContext.getProperty("Pedido");

                    // Inicializa modelo da seção na primeira vez
                    if (!this._oItensPedidoModel) {
                        this._oItensPedidoModel = new JSONModel({
                            items: [],
                            pedido: "",
                            loading: false
                        });
                        this.base.getView().setModel(this._oItensPedidoModel, "itensPedido");
                    }

                    if (sPedido) {
                        this._fetchItensPedidoSection(sPedido);
                    } else {
                        this._oItensPedidoModel.setData({ items: [], pedido: "", loading: false });
                    }
                }
            }
        },

        /**
         * Busca itens do pedido via OData V4
         * @param {string} sPedido - Número do pedido
         */
        _fetchItensPedidoSection: function (sPedido) {
            var that = this;
            var oModel = this.base.getView().getModel();

            this._oItensPedidoModel.setProperty("/loading", true);
            this._oItensPedidoModel.setProperty("/pedido", sPedido);

            var oListBinding = oModel.bindList(
                "/ItemsPO",
                undefined,
                undefined,
                [new Filter("Pedido", FilterOperator.EQ, sPedido)]
            );

            oListBinding.requestContexts(0, 999).then(function (aContexts) {
                var aItems = aContexts.map(function (oCtx) { return oCtx.getObject(); });
                that._oItensPedidoModel.setData({
                    items: aItems,
                    pedido: sPedido,
                    loading: false
                });
            }).catch(function (oError) {
                that._oItensPedidoModel.setProperty("/loading", false);
                MessageBox.error("Erro ao buscar itens do pedido: " + (oError.message || oError));
            });
        },

        // ================================================================
        //  POPUP 3: TÍTULOS VENCIDOS
        // ================================================================

        /**
         * Custom Action: Abre o dialog de Títulos Vencidos
         */
        onAbrirTitulosVencidos: function () {
            if (!this._captureClienteContext()) { return; }

            if (!this._oTitulosModel) {
                this._oTitulosModel = new JSONModel({
                    items: [],
                    customerName: "",
                    totalMontante: "0.00",
                    moeda: "",
                    loading: false
                });
            }

            var that = this;
            var oView = this.base.getView();

            if (!this._oTitulosDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "br.com.gamma.zuiiscockpitassist.ext.fragment.TitulosVencidosDialog",
                    controller: this
                }).then(function (oDialog) {
                    that._oTitulosDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.setModel(that._oTitulosModel, "dlgTitulos");
                    that._fetchTitulosVencidosData();
                    oDialog.open();
                });
            } else {
                this._fetchTitulosVencidosData();
                this._oTitulosDialog.open();
            }
        },

        /**
         * Busca títulos vencidos via OData V4
         */
        _fetchTitulosVencidosData: function () {
            var that = this;
            var oModel = this.base.getView().getModel();

            this._oTitulosModel.setProperty("/loading", true);
            this._oTitulosModel.setProperty("/customerName", this._sCustomerName || this._sCustomer);

            var aFilters = [new Filter("Customer", FilterOperator.EQ, this._sCustomer)];
            if (this._sCompanyCode) {
                aFilters.push(new Filter("CompanyCode", FilterOperator.EQ, this._sCompanyCode));
            }

            var oListBinding = oModel.bindList("/TitulosVencidos", undefined, undefined, aFilters);

            oListBinding.requestContexts(0, 999).then(function (aContexts) {
                var aItems = aContexts.map(function (oCtx) { return oCtx.getObject(); });

                var fTotal = 0;
                var sMoeda = "";
                aItems.forEach(function (item) {
                    fTotal += parseFloat(item.Montante || 0);
                    if (!sMoeda && item.Moeda) { sMoeda = item.Moeda; }
                });

                that._oTitulosModel.setData({
                    items: aItems,
                    customerName: that._sCustomerName || that._sCustomer,
                    totalMontante: fTotal.toFixed(2),
                    moeda: sMoeda,
                    loading: false
                });

                if (aItems.length === 0) {
                    MessageToast.show("Nenhum título vencido para o cliente " + that._sCustomer);
                }
            }).catch(function (oError) {
                that._oTitulosModel.setProperty("/loading", false);
                MessageBox.error("Erro ao buscar títulos vencidos: " + (oError.message || oError));
            });
        },

        /**
         * Handler: Fechar dialog de títulos vencidos
         */
        onFecharTitulosVencidosDialog: function () {
            if (this._oTitulosDialog) {
                this._oTitulosDialog.close();
            }
        }

    });
});
