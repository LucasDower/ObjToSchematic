import { LOC } from '../../localiser';
import { AppIcons } from '../icons';
import { ConfigComponent } from './config';
import { ToolbarItemComponent } from './toolbar_item';
import { OtS_MeshSectionMetadata } from 'ots-core/src/ots_mesh';


export class MaterialTypeComponent extends ConfigComponent<OtS_MeshSectionMetadata['type'] | 'disabled', HTMLDivElement> {
    private _original: OtS_MeshSectionMetadata['type'];
    private _disabledButton: ToolbarItemComponent;
    private _solidButton: ToolbarItemComponent;
    private _colourButton: ToolbarItemComponent;
    private _texturedButton: ToolbarItemComponent;

    public constructor(original: OtS_MeshSectionMetadata, current?: OtS_MeshSectionMetadata) {
        super(current?.type ?? 'disabled');

        this._original = original.type;

        this._disabledButton = new ToolbarItemComponent({ id: 'd', 'iconSVG': AppIcons.BLOCK })
            .onClick(() => {
                if (this.getValue() !== 'disabled') {
                    this._setValue('disabled');
                }
            });

        this._solidButton = new ToolbarItemComponent({ id: 'sw1', iconSVG: AppIcons.COLOUR_SWATCH })
            .setLabel(LOC('materials.components.solid'))
            .setGrow()
            .onClick(() => {
                if (this.getValue() !== 'solid') {
                    this._setValue('solid');
                }
            });
        
        this._colourButton = new ToolbarItemComponent({ id: 'c', 'iconSVG': AppIcons.COLOUR_SWATCH })
            .onClick(() => {
                if (this.getValue() !== 'colour') {
                    this._setValue('colour');
                }
            });

        this._texturedButton = new ToolbarItemComponent({ id: 'sw2', iconSVG: AppIcons.IMAGE })
            .setLabel(LOC('materials.components.textured'))
            .setGrow()
            .onClick(() => {
                if (this.getValue() !== 'textured') {
                    this._setValue('textured');
                }
            });
    }

    public override _generateInnerHTML() {
        return `
            <div class="toolbar-group" style="width: 100%;">
                ${this._disabledButton.generateHTML()}
                ${this._solidButton.generateHTML()}    
                ${this._colourButton.generateHTML()}
                ${this._texturedButton.generateHTML()}
            </div>
        `;
    }

    public override finalise(): void {
        this._disabledButton.finalise();
        this._solidButton.finalise();
        this._colourButton.finalise();
        this._texturedButton.finalise();

        this._disabledButton.setActive(this.getValue() === 'disabled');
        this._solidButton.setActive(this.getValue() === 'solid');
        this._colourButton.setActive(this.getValue() === 'colour');
        this._texturedButton.setActive(this.getValue() === 'textured');
    }

    public override registerEvents(): void {
        this._disabledButton.registerEvents();
        this._solidButton.registerEvents();
        this._colourButton.registerEvents();
        this._texturedButton.registerEvents();
    }

    protected override _onEnabledChanged(): void {
        super._onEnabledChanged();

        this._disabledButton.setEnabled(this.enabled);
        this._solidButton.setEnabled(this.enabled); // All materials can become solid
        this._colourButton.setEnabled(this.enabled && this._original === 'colour');
        this._texturedButton.setEnabled(this.enabled && this._original === 'textured');
    }

    protected override _onValueChanged(): void {
    }
}
