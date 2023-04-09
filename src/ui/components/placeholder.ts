import { TTranslationMap } from '../../../loc/base';
import { DeepLeafKeys, LOC, TLocalisedString } from '../../localiser';
import { UIUtil } from '../../util/ui_util';
import { ConfigComponent } from './config';

export class PlaceholderComponent extends ConfigComponent<undefined, HTMLDivElement> {
    private placeholderLocKey?: string;
    private _placeholderlabel?: TLocalisedString;

    public constructor() {
        super(undefined);
    }

    public setPlaceholderText<P extends DeepLeafKeys<TTranslationMap>>(p: P) {
        this.placeholderLocKey = p;
        this._placeholderlabel = LOC(p);
        return this;
    }

    public override refresh(): void {
        super.refresh();

        this._placeholderlabel = LOC(this.placeholderLocKey as any);
        const placeholderElement = UIUtil.getElementById(`${this._getId()}-placeholder-text`);
        placeholderElement.innerHTML = this._placeholderlabel;
    }

    public override generateHTML(): string {
        return `
            <div class="property" style="justify-content: center;">
                ${this._generateInnerHTML()}
            </div>
        `;
    }

    protected override _generateInnerHTML(): string {
        return `
            <div class="text-dark" id="${this._getId()}-placeholder-text">
                ${this._placeholderlabel}
            </div>
        `;
    }

    public override registerEvents(): void {
    }
}
