import { ConfigComponent } from './config';

export class PlaceholderComponent extends ConfigComponent<undefined, HTMLDivElement> {
    private _placeholderText: string;

    public constructor(placeholderText: string) {
        super(undefined);

        this._placeholderText = placeholderText;
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
            <div class="text-dark">
                ${this._placeholderText}
            </div>
        `;
    }

    public override registerEvents(): void {
    }
}
