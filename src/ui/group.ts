export class ToggleableGroup {

    private _jqueryHtmlElements: Array<string>;
    private _visibilityElement: string;

    public constructor(jqueryHtmlElements: Array<string>, visibilityElement: string, enabledOnStart: boolean) {
        this._jqueryHtmlElements = jqueryHtmlElements
        this._visibilityElement = visibilityElement
        this.setEnabled(enabledOnStart);
    }

    public setEnabled(isEnabled: boolean) {
        this._jqueryHtmlElements.forEach(htmlElement => {
            $(htmlElement).prop('disabled', !isEnabled);
        });
        if (isEnabled) {
            $(this._visibilityElement).removeClass("transparent");
        } else {
            $(this._visibilityElement).addClass("transparent");
        }
    }

}