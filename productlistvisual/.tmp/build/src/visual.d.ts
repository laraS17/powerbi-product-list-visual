import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import IVisual = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions = powerbi.extensibility.visual.VisualUpdateOptions;
export declare class Visual implements IVisual {
    private target;
    private host;
    private selectionManager;
    private dataPoints;
    private selectedProductIds;
    private updateCounter;
    private pageIndex;
    private readonly pageSize;
    constructor(options: VisualConstructorOptions);
    update(options: VisualUpdateOptions): void;
    private render;
    private toggleSelectAll;
    private toggleSelection;
    private formatNumber;
}
