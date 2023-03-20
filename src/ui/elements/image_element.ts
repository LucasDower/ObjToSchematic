import { TImageFiletype, TImageRawWrap } from '../../texture';
import { getRandomID } from '../../util';
import { ASSERT } from '../../util/error_util';
import { UIUtil } from '../../util/ui_util';
import { AppIcons } from '../icons';
import { ConfigUIElement } from './config_element';
import { ToolbarItemElement } from './toolbar_item';

export class ImageElement extends ConfigUIElement<Promise<TImageRawWrap>, HTMLImageElement> {
    private _switchElement: ToolbarItemElement;

    private _imageId: string;

    public constructor(param?: TImageRawWrap) {
        super(Promise.resolve(param ?? { raw: '', filetype: 'png' }));

        this._switchElement = new ToolbarItemElement({ id: 'sw', iconSVG: AppIcons.UPLOAD })
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
                    <div id="${this._imageId}-placeholder" class="texture-preview-placeholder">
                        <div class="row-container" style="align-items: center;">
                            <div class="row-item">${AppIcons.IMAGE_MISSING}</div>
                            <div class="row-item">No image loaded</div>
                        </div>
                    </div>
                </div>
                <div class="row-item">
                    <input type="file" accept="images/png" style="display: none;" id="${this._getId()}-input">
                    ${this._switchElement.generateHTML()}
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
                ASSERT(file.type === 'image/jpeg' || file.type === 'image/png', 'Unexpected image type');

                this._setValue(new Promise((res, rej) => {
                    const fileReader = new FileReader();
                    fileReader.onload = function () {
                        if (typeof fileReader.result === 'string') {
                            res({ filetype: file.type === 'image/jpeg' ? 'jpg' : 'png', raw: fileReader.result });
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
        super._onEnabledChanged();

        this._switchElement.setEnabled(this.enabled);
    }

    protected override _onValueChanged(): void {
        const inputElement = UIUtil.getElementById(this._imageId) as HTMLImageElement;
        const placeholderElement = UIUtil.getElementById(this._imageId + '-placeholder');

        this.getValue()
            .then((res) => {
                if (res.raw === '') {
                    throw Error();
                }
                this._switchElement.setActive(false);
                inputElement.src = res.raw;
                inputElement.style.display = 'unset';
                placeholderElement.style.display = 'none';
            })
            .catch((err) => {
                this._switchElement.setActive(true);
                inputElement.src = '';
                inputElement.style.display = 'none';
                placeholderElement.style.display = 'flex';
            });
    }

    public override finalise(): void {
        super.finalise();

        this._onValueChanged();
        this._onEnabledChanged();
    }
}
