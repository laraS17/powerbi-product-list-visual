"use strict";

import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";

import DataView = powerbi.DataView;

export class Visual implements powerbi.extensibility.visual.IVisual {
    private target: HTMLElement;

    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions) {
        this.target = options.element;
        this.target.classList.add("product-list-root");
    }

    public update(options: powerbi.extensibility.visual.VisualUpdateOptions): void {
        const dataView: DataView = options.dataViews && options.dataViews[0];

        if (!dataView || !dataView.categorical) {
            this.target.innerHTML = "<div class='empty-state'>Aucune donnée</div>";
            return;
        }

        const categorical = dataView.categorical;
        const categories = categorical.categories && categorical.categories[0];
        const values = categorical.values && categorical.values[0];

        if (!categories || !values) {
            this.target.innerHTML = "<div class='empty-state'>Aucune donnée</div>";
            return;
        }

        let html = `<div class="product-list">`;

        for (let i = 0; i < categories.values.length; i++) {
            const name = categories.values[i];
            const kpi = values.values[i];

            html += `
                <div class="product-row">
                    <div class="product-name">${name}</div>
                    <div class="product-kpi">${kpi}</div>
                </div>
            `;
        }

        html += `</div>`;

        this.target.innerHTML = html;
    }
}
