import { LOC } from '../../localiser';
import { getRandomID } from '../../../../Core/src/util';
import { ASSERT } from '../../../../Core/src/util/error_util';
import { UIUtil } from '../../../../Core/src/util/ui_util';
import { AppIcons } from '../icons';
import { ConfigComponent } from './config';
import { ToolbarItemComponent } from './toolbar_item';
import { TImageRawWrap } from 'Editor/src/texture_reader';

export class ImageComponent extends ConfigComponent<Promise<TImageRawWrap>, HTMLImageElement> {
    private _switchElement: ToolbarItemComponent;

    private _imageId: string;

    public constructor(param?: TImageRawWrap) {
        super(param !== undefined
            ? Promise.resolve(param ?? { raw: '', filetype: 'png' })
            : Promise.reject('No image'),
        );

        this._switchElement = new ToolbarItemComponent({ id: 'sw', iconSVG: AppIcons.UPLOAD })
            .setLabel(LOC('materials.components.choose'))
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
                            <div class="row-item">${LOC('materials.components.no_image_loaded')}</div>
                        </div>
                    </div>
                </div>
                <div class="row-item">
                    <input type="file" accept="image/png,image/jpeg" style="display: none;" id="${this._getId()}-input">
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
                            // convert image file to base64 string
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

        const imageElement = UIUtil.getElementById(this._imageId) as HTMLImageElement;
        const placeholderComponent = UIUtil.getElementById(this._imageId + '-placeholder');
        if (!this.enabled) {
            imageElement.classList.add('disabled');
            placeholderComponent.classList.add('disabled');
        } else {
            imageElement.classList.remove('disabled');
            placeholderComponent.classList.remove('disabled');
        }

        this._switchElement.setEnabled(this.enabled);
    }

    protected override _onValueChanged(): void {
        const inputElement = UIUtil.getElementById(this._imageId) as HTMLImageElement;
        const placeholderComponent = UIUtil.getElementById(this._imageId + '-placeholder');

        this.getValue()
            .then((res) => {
                if (res.raw === '') {
                    throw Error();
                }
                this._switchElement.setActive(false);
                inputElement.src = res.raw;
                inputElement.style.display = 'unset';
                placeholderComponent.style.display = 'none';
            })
            .catch((err) => {
                this._switchElement.setActive(true);
                inputElement.src = '';
                inputElement.style.display = 'none';
                placeholderComponent.style.display = 'flex';
            });
    }

    public override finalise(): void {
        super.finalise();

        this._onValueChanged();
        this._onEnabledChanged();
    }
}
