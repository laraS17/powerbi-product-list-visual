import "core-js/stable";
import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
export declare class Visual implements powerbi.extensibility.visual.IVisual {
    private target;
    constructor(options: powerbi.extensibility.visual.VisualConstructorOptions);
    update(options: powerbi.extensibility.visual.VisualUpdateOptions): void;
}
