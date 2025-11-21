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
}

export class Visual implements IVisual {
    private target: HTMLElement;
    private host: IVisualHost;
    private selectionManager: ISelectionManager;
    private dataPoints: ProductDataPoint[] = [];

    constructor(options: VisualConstructorOptions) {
        this.target = options.element;
        this.host = options.host;
        this.selectionManager = this.host.createSelectionManager();

        this.target.classList.add("product-list-root");
    }

    public update(options: VisualUpdateOptions): void {
        const dataView: DataView = options.dataViews && options.dataViews[0];

        if (!dataView || !dataView.categorical) {
            this.target.innerHTML = "<div class='empty-state'>Aucune donnée</div>";
            this.dataPoints = [];
            return;
        }

        const categorical = dataView.categorical;
        const category = categorical.categories && categorical.categories[0];
        const values = categorical.values || [];

        if (!category) {
            this.target.innerHTML = "<div class='empty-state'>Aucune donnée</div>";
            this.dataPoints = [];
            return;
        }

        // Récupérer les colonnes par rôle
        let imageCol: any = null;
        let referenceCol: any = null;
        let libelleCol: any = null;
        let marqueCol: any = null;
        let fournisseurCol: any = null;
        let statutCol: any = null;
        let rayonCol: any = null;
        let pvcCol: any = null;

        values.forEach((col: any) => {
            const roles = (col.source && col.source.roles) ? col.source.roles : {};
            if (roles.imageUrl) {
                imageCol = col;
            } else if (roles.reference) {
                referenceCol = col;
            } else if (roles.libelle) {
                libelleCol = col;
            } else if (roles.marque) {
                marqueCol = col;
            } else if (roles.fournisseur) {
                fournisseurCol = col;
            } else if (roles.statut) {
                statutCol = col;
            } else if (roles.rayon) {
                rayonCol = col;
            } else if (roles.pvc) {
                pvcCol = col;
            }
        });

        this.dataPoints = [];
        const rowCount = category.values.length;

        for (let i = 0; i < rowCount; i++) {
            const idRaw = category.values[i];

            const selectionId = this.host
                .createSelectionIdBuilder()
                .withCategory(category, i)
                .createSelectionId();

            const dp: ProductDataPoint = {
                id: idRaw !== undefined && idRaw !== null ? String(idRaw) : "",
                imageUrl: imageCol && imageCol.values ? String(imageCol.values[i] ?? "") : "",
                reference: referenceCol && referenceCol.values ? String(referenceCol.values[i] ?? "") : "",
                libelle: libelleCol && libelleCol.values ? String(libelleCol.values[i] ?? "") : "",
                marque: marqueCol && marqueCol.values ? String(marqueCol.values[i] ?? "") : "",
                fournisseur: fournisseurCol && fournisseurCol.values ? String(fournisseurCol.values[i] ?? "") : "",
                statut: statutCol && statutCol.values ? String(statutCol.values[i] ?? "") : "",
                rayon: rayonCol && rayonCol.values ? String(rayonCol.values[i] ?? "") : "",
                pvc: pvcCol && pvcCol.values ? pvcCol.values[i] : null,
                selectionId: selectionId
            };

            this.dataPoints.push(dp);
        }

        this.render();
    }

    private render(): void {
        // Nettoyer le contenu
        this.target.innerHTML = "";

        if (!this.dataPoints || this.dataPoints.length === 0) {
            this.target.innerHTML = "<div class='empty-state'>Aucune donnée</div>";
            return;
        }

        const listContainer = document.createElement("div");
        listContainer.className = "product-list";

        this.dataPoints.forEach((dp) => {
            const row = document.createElement("div");
            row.className = "product-row";
            // on conserve l'ID en data-attribute (non affiché)
            row.setAttribute("data-product-id", dp.id);

            // Colonne gauche : image / placeholder
            const left = document.createElement("div");
            left.className = "product-left";

            if (dp.imageUrl) {
                const img = document.createElement("img");
                img.className = "product-image";
                img.src = dp.imageUrl;
                img.alt = dp.libelle || dp.reference || "Produit";
                left.appendChild(img);
            } else {
                const placeholder = document.createElement("div");
                placeholder.className = "product-image-placeholder";
                const initial = (dp.libelle || dp.reference || "?").toString().charAt(0).toUpperCase();
                placeholder.textContent = initial;
                left.appendChild(placeholder);
            }

            // Colonne centrale : libellé + meta
            const main = document.createElement("div");
            main.className = "product-main";

            const title = document.createElement("div");
            title.className = "product-libelle";
            title.textContent = dp.libelle || dp.reference || "(Sans libellé)";
            main.appendChild(title);

            const meta = document.createElement("div");
            meta.className = "product-meta";

            const metaParts: string[] = [];
            if (dp.reference) metaParts.push(`Réf. ${dp.reference}`);
            if (dp.marque) metaParts.push(dp.marque);
            if (dp.fournisseur) metaParts.push(dp.fournisseur);
            if (dp.rayon) metaParts.push(dp.rayon);
            if (dp.statut) metaParts.push(dp.statut);

            meta.textContent = metaParts.join(" • ");
            main.appendChild(meta);

            // Colonne droite : PVC + bouton
            const right = document.createElement("div");
            right.className = "product-right";

            const price = document.createElement("div");
            price.className = "product-pvc";
            if (dp.pvc !== null && dp.pvc !== undefined && dp.pvc !== "") {
                price.textContent = this.formatNumber(dp.pvc) + " €";
            }
            right.appendChild(price);

            const button = document.createElement("button");
            button.className = "product-select-button";
            button.type = "button";
            button.textContent = "Sélectionner";
            right.appendChild(button);

            // Sélection (ligne + bouton)
            const handleClick = () => {
                this.selectionManager
                    .select(dp.selectionId, false)
                    .then((ids) => {
                        const rows = this.target.getElementsByClassName("product-row");
                        for (let i = 0; i < rows.length; i++) {
                            const el = rows[i] as HTMLElement;
                            if (el === row && ids.length > 0) {
                                el.classList.add("selected");
                            } else {
                                el.classList.remove("selected");
                            }
                        }
                    })
                    .catch((e) => {
                        console.error(e);
                    });
            };

            row.onclick = handleClick;
            button.onclick = (ev) => {
                ev.stopPropagation();
                handleClick();
            };

            row.appendChild(left);
            row.appendChild(main);
            row.appendChild(right);

            listContainer.appendChild(row);
        });

        this.target.appendChild(listContainer);
    }

    private formatNumber(value: any): string {
        if (value === null || value === undefined || isNaN(Number(value))) {
            return "";
        }
        return Number(value).toLocaleString("fr-FR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }
}
