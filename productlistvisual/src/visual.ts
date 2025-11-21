"use strict";

import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";

import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
import DataView = powerbi.DataView;
import IVisualHost = powerbi.extensibility.visual.IVisualHost;
import ISelectionManager = powerbi.extensibility.ISelectionManager;
import ISelectionId = powerbi.visuals.ISelectionId;

interface ProductDataPoint {
    id: string;
    imageUrl: string;
    reference: string;
    libelle: string;
    marque: string;
    fournisseur: string;
    statut: string;
    rayon: string;
    pvc: any;
    selectionId: ISelectionId;
    index: number;
}

export class Visual implements IVisual {
    private target: HTMLElement;
    private host: IVisualHost;
    private selectionManager: ISelectionManager;
    private dataPoints: ProductDataPoint[] = [];
    
    // Sélection par ID produit (persiste entre les pages)
    private selectedProductIds: Set<string> = new Set();
    private updateCounter: number = 0;
    
    // Pagination
    private pageIndex: number = 0;
    private readonly pageSize: number = 20; // 20 produits par page

    constructor(options: VisualConstructorOptions) {
        this.target = options.element;
        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();
        this.target.classList.add("product-list-root");
        console.log("🏗️ CONSTRUCTOR appelé");
    }

    public update(options: VisualUpdateOptions): void {
        this.updateCounter++;
        
        // LOGS ULTRA VISIBLES
        console.log("\n\n");
        console.log("🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨");
        console.log(`🚨 UPDATE #${this.updateCounter} APPELÉ`);
        console.log("🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨🚨");
        console.log(`💾 selectedProductIds AU DÉBUT: [${Array.from(this.selectedProductIds).join(", ")}]`);
        console.log(`💾 Taille: ${this.selectedProductIds.size}`);
        console.log("\n");
        
        const dataView: DataView = options.dataViews && options.dataViews[0];

        if (!dataView || !dataView.categorical) {
            console.log("❌ Pas de dataView.categorical");
            this.target.innerHTML = "<div class='empty-state'>Pas de données</div>";
            return;
        }

        const categorical = dataView.categorical;
        const categories = categorical.categories || [];
        const values = categorical.values || [];

        console.log(`\n📦 CATEGORIES: ${categories.length} | VALUES: ${values.length}`);

        // Fonction pour chercher par rôle
        const findByRole = (roleName: string): { found: boolean, location: string, column: any } => {
            for (const cat of categories) {
                if (cat.source.roles && cat.source.roles[roleName]) {
                    return { found: true, location: "CATEGORY", column: cat };
                }
            }
            for (const val of values) {
                if (val.source.roles && val.source.roles[roleName]) {
                    return { found: true, location: "VALUE", column: val };
                }
            }
            return { found: false, location: "NOWHERE", column: null };
        };

        const rolesToCheck = [
            "productId", "imageUrl", "reference", "libelle", 
            "marque", "fournisseur", "statut", "rayon", "pvc"
        ];

        const roleResults: any = {};

        console.log("\n🔍 RECHERCHE PAR RÔLE:");
        rolesToCheck.forEach(role => {
            const result = findByRole(role);
            roleResults[role] = result;
            
            if (result.found) {
                console.log(`✓ "${role}" → ${result.location}: "${result.column.source.displayName}"`);
            } else {
                console.log(`✗ "${role}" → NON TROUVÉ`);
            }
        });

        if (!roleResults.productId.found) {
            console.log("\n❌ ERREUR : productId non trouvé !");
            this.target.innerHTML = "<div class='empty-state'>Mappez le champ ID produit</div>";
            return;
        }

        const idCol = roleResults.productId.column;
        const rowCount = idCol.values.length;

        console.log(`\n📊 NOMBRE DE LIGNES: ${rowCount}`);
        console.log(`⚠️ CRITIQUE: Si ce nombre change, Power BI filtre les données après sélection !`);

        if (rowCount === 0) {
            this.target.innerHTML = "<div class='empty-state'>Aucune donnée</div>";
            return;
        }

        // Helper
        const getValue = (roleResult: any, index: number): any => {
            if (!roleResult?.found || !roleResult.column?.values) return null;
            return roleResult.column.values[index];
        };

        const getString = (roleResult: any, index: number): string => {
            const val = getValue(roleResult, index);
            return val !== null && val !== undefined ? String(val) : "";
        };

        console.log("\n🏗️ CONSTRUCTION DES DATAPOINTS:");

        this.dataPoints = [];

        for (let i = 0; i < rowCount; i++) {
            const selectionId = this.host
                .createSelectionIdBuilder()
                .withCategory(idCol, i)
                .createSelectionId();

            const productId = getString(roleResults.productId, i);

            const dp: ProductDataPoint = {
                id: productId,
                imageUrl: getString(roleResults.imageUrl, i),
                reference: getString(roleResults.reference, i),
                libelle: getString(roleResults.libelle, i),
                marque: getString(roleResults.marque, i),
                fournisseur: getString(roleResults.fournisseur, i),
                statut: getString(roleResults.statut, i),
                rayon: getString(roleResults.rayon, i),
                pvc: getValue(roleResults.pvc, i),
                selectionId: selectionId,
                index: i
            };

            this.dataPoints.push(dp);
        }

        console.log(`✅ ${this.dataPoints.length} dataPoints créés`);
        console.log(`💾 IDs sélectionnés conservés: [${Array.from(this.selectedProductIds).join(", ")}]`);
        console.log(`${"=".repeat(80)}\n`);

        this.render();
    }

    private render(): void {
        console.log(`🎨 RENDER: ${this.dataPoints.length} dataPoints, ${this.selectedProductIds.size} sélectionnés [${Array.from(this.selectedProductIds).slice(0, 5).join(", ")}${this.selectedProductIds.size > 5 ? "..." : ""}]`);

        this.target.innerHTML = "";

        if (this.dataPoints.length === 0) {
            this.target.innerHTML = "<div class='empty-state'>Aucune donnée</div>";
            return;
        }

        // Calculer la pagination
        const totalPages = Math.max(1, Math.ceil(this.dataPoints.length / this.pageSize));
        if (this.pageIndex >= totalPages) {
            this.pageIndex = totalPages - 1;
        }
        if (this.pageIndex < 0) {
            this.pageIndex = 0;
        }
        
        const startIndex = this.pageIndex * this.pageSize;
        const endIndex = Math.min(startIndex + this.pageSize, this.dataPoints.length);
        const pageData = this.dataPoints.slice(startIndex, endIndex);
        
        console.log(`📄 Page ${this.pageIndex + 1}/${totalPages} - Affichage de ${pageData.length} produits (${startIndex} à ${endIndex - 1})`);

        const container = document.createElement("div");
        container.className = "product-table-container";

        // HEADER
        const header = document.createElement("div");
        header.className = "product-header-row";
        header.innerHTML = `
            <div class="product-header-cell col-image">Img</div>
            <div class="product-header-cell">Réf.</div>
            <div class="product-header-cell">Libellé</div>
            <div class="product-header-cell">Marque</div>
            <div class="product-header-cell">Fournisseur</div>
            <div class="product-header-cell">Statut</div>
            <div class="product-header-cell">Rayon</div>
            <div class="product-header-cell">PVC</div>
            <div class="product-header-cell col-select"></div>
        `;
        
        // Ajouter le bouton "Tout sélectionner" dans la dernière cellule du header
        const headerSelectCell = header.querySelector(".col-select");
        if (headerSelectCell) {
            const selectAllCheckbox = document.createElement("input");
            selectAllCheckbox.type = "checkbox";
            selectAllCheckbox.className = "product-select-all-checkbox";
            selectAllCheckbox.title = "Tout sélectionner / Tout désélectionner";
            
            // Coché si TOUS les produits sont sélectionnés
            const allSelected = this.dataPoints.length > 0 && 
                                this.dataPoints.every(dp => this.selectedProductIds.has(dp.id));
            selectAllCheckbox.checked = allSelected;
            
            selectAllCheckbox.onchange = (e) => {
                e.stopPropagation();
                this.toggleSelectAll();
            };
            
            headerSelectCell.appendChild(selectAllCheckbox);
        }
        
        container.appendChild(header);

        // LIGNES - Affichage de la page courante
        pageData.forEach((dp) => {
            const isSelected = this.selectedProductIds.has(dp.id);

            const row = document.createElement("div");
            row.className = "product-row";
            row.setAttribute("data-product-id", dp.id);
            row.setAttribute("data-index", String(dp.index));
            
            if (isSelected) row.classList.add("selected");

            // Image
            const cellImage = document.createElement("div");
            cellImage.className = "product-cell col-image";
            if (dp.imageUrl && dp.imageUrl.startsWith("http")) {
                const img = document.createElement("img");
                img.className = "product-image";
                img.src = dp.imageUrl;
                img.alt = dp.libelle || dp.reference;
                img.onerror = () => {
                    img.style.display = "none";
                    const placeholder = document.createElement("div");
                    placeholder.className = "product-image-placeholder";
                    placeholder.textContent = (dp.reference || "?")[0].toUpperCase();
                    cellImage.appendChild(placeholder);
                };
                cellImage.appendChild(img);
            } else {
                const placeholder = document.createElement("div");
                placeholder.className = "product-image-placeholder";
                placeholder.textContent = (dp.reference || "?")[0].toUpperCase();
                cellImage.appendChild(placeholder);
            }
            row.appendChild(cellImage);

            // Colonnes
            const cells = [
                dp.reference,
                dp.libelle,
                dp.marque,
                dp.fournisseur,
                dp.statut,
                dp.rayon,
                dp.pvc !== null && dp.pvc !== undefined ? this.formatNumber(dp.pvc) + "€" : ""
            ];

            cells.forEach((text) => {
                const cell = document.createElement("div");
                cell.className = "product-cell";
                cell.textContent = text;
                row.appendChild(cell);
            });

            // Checkbox
            const cellCheck = document.createElement("div");
            cellCheck.className = "product-cell col-select";
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.checked = isSelected;
            
            checkbox.onchange = (e) => {
                e.stopPropagation();
                this.toggleSelection(dp.id);
            };
            
            row.onclick = () => this.toggleSelection(dp.id);
            
            cellCheck.appendChild(checkbox);
            row.appendChild(cellCheck);

            container.appendChild(row);
        });

        // PAGINATION
        if (totalPages > 1) {
            const pagination = document.createElement("div");
            pagination.className = "product-pagination";
            pagination.style.cssText = "display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 15px; padding: 10px;";

            // Bouton Précédent
            const prevBtn = document.createElement("button");
            prevBtn.className = "product-page-button";
            prevBtn.textContent = "◀ Précédent";
            prevBtn.disabled = this.pageIndex === 0;
            prevBtn.style.cssText = "padding: 6px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; font-size: 12px;";
            if (prevBtn.disabled) {
                prevBtn.style.opacity = "0.5";
                prevBtn.style.cursor = "not-allowed";
            }
            prevBtn.onclick = () => {
                if (this.pageIndex > 0) {
                    this.pageIndex--;
                    console.log(`📄 Page précédente: ${this.pageIndex + 1}/${totalPages}`);
                    this.render();
                }
            };

            // Info page
            const pageInfo = document.createElement("div");
            pageInfo.className = "product-page-info";
            pageInfo.style.cssText = "font-size: 12px; padding: 0 15px; font-weight: 500;";
            pageInfo.textContent = `Page ${this.pageIndex + 1} / ${totalPages} (${this.dataPoints.length} produits)`;

            // Bouton Suivant
            const nextBtn = document.createElement("button");
            nextBtn.className = "product-page-button";
            nextBtn.textContent = "Suivant ▶";
            nextBtn.disabled = this.pageIndex >= totalPages - 1;
            nextBtn.style.cssText = "padding: 6px 12px; border: 1px solid #ddd; border-radius: 4px; background: white; cursor: pointer; font-size: 12px;";
            if (nextBtn.disabled) {
                nextBtn.style.opacity = "0.5";
                nextBtn.style.cursor = "not-allowed";
            }
            nextBtn.onclick = () => {
                if (this.pageIndex < totalPages - 1) {
                    this.pageIndex++;
                    console.log(`📄 Page suivante: ${this.pageIndex + 1}/${totalPages}`);
                    this.render();
                }
            };

            pagination.appendChild(prevBtn);
            pagination.appendChild(pageInfo);
            pagination.appendChild(nextBtn);

            container.appendChild(pagination);
        }

        // Debug box
        const debugInfo = document.createElement("div");
        debugInfo.style.cssText = "margin: 10px 0; padding: 10px; background: #e8f5e9; border: 2px solid #4caf50; font: 11px monospace;";
        
        const percentSelected = this.dataPoints.length > 0 
            ? Math.round((this.selectedProductIds.size / this.dataPoints.length) * 100) 
            : 0;
        
        debugInfo.innerHTML = `
            <b>✅ Sélection fonctionnelle | Par ID produit</b><br>
            Total: ${this.dataPoints.length} produits | 
            Sélectionnés: ${this.selectedProductIds.size} (${percentSelected}%)<br>
            ${this.selectedProductIds.size > 0 ? 
                `IDs: [${Array.from(this.selectedProductIds).slice(0, 3).join(", ")}${this.selectedProductIds.size > 3 ? "..." : ""}]<br>` 
                : "Aucune sélection<br>"
            }
            ${this.selectedProductIds.size > 300 ? 
                '<span style="color: orange;">⚠️ > 300 produits sélectionnés, peut être lent</span><br>' 
                : ""
            }
            <b>Astuce:</b> Utilisez la checkbox en haut à droite pour tout sélectionner/désélectionner
        `;
        container.appendChild(debugInfo);

        this.target.appendChild(container);
    }

    private toggleSelectAll(): void {
        console.log(`\n${"★".repeat(40)}`);
        console.log(`⭐ TOGGLE SELECT ALL`);
        console.log(`Avant: ${this.selectedProductIds.size} produits sélectionnés`);
        
        // Vérifier si tout est déjà sélectionné
        const allSelected = this.dataPoints.every(dp => this.selectedProductIds.has(dp.id));
        
        if (allSelected) {
            // Tout désélectionner
            console.log(`Action: TOUT DÉSÉLECTIONNER (${this.dataPoints.length} produits)`);
            this.selectedProductIds.clear();
        } else {
            // Tout sélectionner
            console.log(`Action: TOUT SÉLECTIONNER (${this.dataPoints.length} produits)`);
            this.dataPoints.forEach(dp => {
                this.selectedProductIds.add(dp.id);
            });
        }
        
        console.log(`Après: ${this.selectedProductIds.size} produits sélectionnés`);

        // Construire les IDs Power BI
        const selectedIds: ISelectionId[] = [];
        this.dataPoints.forEach(dp => {
            if (this.selectedProductIds.has(dp.id)) {
                selectedIds.push(dp.selectionId);
            }
        });

        console.log(`→ Power BI: ${selectedIds.length} IDs (sur ${this.dataPoints.length} dataPoints)`);
        console.log(`⚠️ ATTENTION: Si > 300 produits, peut être lent !`);

        if (selectedIds.length === 0) {
            console.log("→ Appel: selectionManager.clear()");
            this.selectionManager.clear()
                .then(() => {
                    console.log(`✓ Cleared`);
                })
                .catch(e => console.error(`✗ Error:`, e));
        } else {
            console.log(`→ Appel: selectionManager.clear() puis select(${selectedIds.length} IDs)`);
            
            this.selectionManager.clear()
                .then(() => {
                    console.log(`  ✓ Clear OK`);
                    return this.selectionManager.select(selectedIds, true);
                })
                .then(() => {
                    console.log(`  ✓ Select OK - ${selectedIds.length} IDs sélectionnés`);
                })
                .catch(e => {
                    console.error(`  ✗ Error:`, e);
                });
        }

        console.log(`${"★".repeat(40)}\n`);
        this.render();
    }

    private toggleSelection(productId: string): void {
        console.log(`\n${"▼".repeat(40)}`);
        console.log(`🔘 TOGGLE productId: "${productId}"`);
        console.log(`📋 Type: ${typeof productId}, Longueur: ${productId.length}`);
        console.log(`Avant: [${Array.from(this.selectedProductIds).join(", ")}]`);
        
        // Debug: afficher tous les IDs disponibles
        console.log(`📦 IDs disponibles dans dataPoints (5 premiers):`);
        this.dataPoints.slice(0, 5).forEach((dp, idx) => {
            console.log(`  [${idx}] dp.id="${dp.id}" | dp.reference="${dp.reference}"`);
        });
        
        if (this.selectedProductIds.has(productId)) {
            this.selectedProductIds.delete(productId);
            console.log(`Action: DELETE "${productId}"`);
        } else {
            this.selectedProductIds.add(productId);
            console.log(`Action: ADD "${productId}"`);
        }
        
        console.log(`Après: [${Array.from(this.selectedProductIds).join(", ")}]`);

        // Construire les IDs Power BI à partir des productIds sélectionnés
        const selectedIds: ISelectionId[] = [];
        this.dataPoints.forEach(dp => {
            if (this.selectedProductIds.has(dp.id)) {
                selectedIds.push(dp.selectionId);
            }
        });

        console.log(`→ Power BI: ${selectedIds.length} IDs (sur ${this.dataPoints.length} dataPoints)`);

        if (selectedIds.length === 0) {
            console.log("→ Appel: selectionManager.clear()");
            this.selectionManager.clear()
                .then(() => console.log(`✓ Cleared`))
                .catch(e => console.error(`✗ Error:`, e));
        } else {
            // CHANGEMENT CRITIQUE: NE PAS utiliser multiSelect=true
            // Au lieu de ça, on construit une nouvelle sélection complète à chaque fois
            console.log(`→ Appel: selectionManager.clear() puis select() pour chaque ID`);
            
            this.selectionManager.clear()
                .then(() => {
                    console.log(`  ✓ Clear OK, maintenant select des ${selectedIds.length} IDs...`);
                    
                    // Sélectionner TOUS les IDs en une seule fois avec multiSelect true
                    return this.selectionManager.select(selectedIds, true);
                })
                .then(() => {
                    console.log(`  ✓ Select OK - ${selectedIds.length} IDs sélectionnés`);
                })
                .catch(e => {
                    console.error(`  ✗ Error during selection:`, e);
                });
        }

        console.log(`${"▲".repeat(40)}\n`);
        this.render();
    }

    private formatNumber(value: any): string {
        if (value === null || value === undefined || isNaN(Number(value))) return "";
        return Number(value).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
}