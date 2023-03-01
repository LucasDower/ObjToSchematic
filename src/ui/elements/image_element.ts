import { getRandomID } from '../../util';
import { ASSERT } from '../../util/error_util';
import { UIUtil } from '../../util/ui_util';
import { AppIcons } from '../icons';
import { ConfigUIElement } from './config_element';
import { ToolbarItemElement } from './toolbar_item';

export class ImageElement extends ConfigUIElement<Promise<string>, HTMLImageElement> {
    private _switchElement: ToolbarItemElement;

    private _imageId: string;

    public constructor(source?: string) {
        super(Promise.resolve(source ?? ''));

        this._switchElement = new ToolbarItemElement({ id: 'sw', iconSVG: AppIcons.UPLOAD })
            .setSmall()
            .setLabel('Choose')
            .onClick(() => {
                const inputElement = UIUtil.getElementById(this._getId() + '-input') as HTMLInputElement;
                inputElement.click();
            });

        this._imageId = getRandomID();
    }

    public override _generateInnerHTML() {
        return `
            <div class="row-container">
                <div class="row-item">
                    <img id="${this._imageId}" alt="Texture Preview" class="texture-preview" loading="lazy"></img>
                </div>
                <div class="row-item">
                <div class="col-container">
                        <div class="col-item">
                            <input type="file" accept="images/png" style="display: none;" id="${this._getId()}-input">
                            ${this._switchElement.generateHTML()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    public override registerEvents(): void {
        this._switchElement.registerEvents();

        const inputElement = UIUtil.getElementById(this._getId() + '-input') as HTMLInputElement;
        inputElement.addEventListener('change', () => {
            const files = inputElement.files;
            if (files?.length === 1) {
                const file = files.item(0);
                ASSERT(file !== null);

                this._setValue(new Promise((res, rej) => {
                    const fileReader = new FileReader();
                    fileReader.onload = function () {
                        if (typeof fileReader.result === 'string') {
                            res(fileReader.result);
                        } else {
                            rej(Error());
                        }
                    };
                    fileReader.readAsDataURL(file);
                }));
            }
        });
    }

    protected override _onEnabledChanged(): void {
    }

    protected override _onValueChanged(): void {
        const inputElement = UIUtil.getElementById(this._imageId) as HTMLImageElement;
        this.getValue()
            .then((source) => {
                if (source === '') {
                    throw Error();
                }
                this._switchElement.setActive(false);
                inputElement.src = source;
                inputElement.style.display = 'unset';
            })
            .catch((err) => {
                this._switchElement.setActive(true);
                inputElement.src = '';
                inputElement.style.display = 'none';
            });
    }

    public override finalise(): void {
        super.finalise();

        this._onValueChanged();
    }
}
