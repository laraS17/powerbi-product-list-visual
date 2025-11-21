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
    name: string;
    kpi: any;
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
        const categories = categorical.categories && categorical.categories[0];
        const values = categorical.values && categorical.values[0];

        if (!categories || !values) {
            this.target.innerHTML = "<div class='empty-state'>Aucune donnée</div>";
            this.dataPoints = [];
            return;
        }

        // Construire les dataPoints avec un selectionId par ligne
        this.dataPoints = [];

        for (let i = 0; i < categories.values.length; i++) {
            const name = categories.values[i];
            const kpi = values.values[i];

            const selectionId = this.host
                .createSelectionIdBuilder()
                .withCategory(categories, i)
                .createSelectionId();

            this.dataPoints.push({
                name: String(name),
                kpi: kpi,
                selectionId: selectionId
            });
        }

        // Reconstruire le DOM proprement
        this.render();
    }

    private render(): void {
        // Nettoyer le contenu
        this.target.innerHTML = "";

        const listContainer = document.createElement("div");
        listContainer.className = "product-list";

        this.dataPoints.forEach((dp, index) => {
            const row = document.createElement("div");
            row.className = "product-row";

            row.innerHTML = `
                <div class="product-name">${dp.name}</div>
                <div class="product-kpi">${dp.kpi}</div>
            `;

            // Gestion du clic → sélection Power BI
            row.onclick = () => {
                this.selectionManager
                    .select(dp.selectionId, false) // false = pas de multi-sélection
                    .then((ids) => {
                        // Met à jour le style visuel des lignes
                        const rows = this.target.getElementsByClassName("product-row");
                        for (let i = 0; i < rows.length; i++) {
                            const el = rows[i] as HTMLElement;
                            if (i === index && ids.length > 0) {
                                el.classList.add("selected");
                            } else {
                                el.classList.remove("selected");
                            }
                        }
                    })
                    .catch((e) => {
                        // En cas d’erreur on ignore
                        // (on évite de casser le visuel pour un click)
                        console.error(e);
                    });
            };

            listContainer.appendChild(row);
        });

        this.target.appendChild(listContainer);
    }
}
