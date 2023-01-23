import { remote } from 'electron';
import path from 'path';

import { getRandomID } from '../../util';
import { FileUtil } from '../../util/file_util';
import { UIUtil } from '../../util/ui_util';
import { ConfigUIElement } from './config_element';
import { ToolbarItemElement } from './toolbar_item';

export class ImageElement extends ConfigUIElement<string, HTMLDivElement> {
    private _switchElement: ToolbarItemElement;
    private _openElement: ToolbarItemElement;

    private _imageId: string;

    public constructor(path: string) {
        super(path);
        this._switchElement = new ToolbarItemElement({ icon: 'upload' })
            .setSmall()
            .setLabel('Choose')
            .onClick(() => {
                const files = remote.dialog.showOpenDialogSync({
                    title: 'Load',
                    buttonLabel: 'Load',
                    filters: [{
                        name: 'Images',
                        extensions: ['png', 'jpeg', 'jpg', 'tga'],
                    }],
                });
                if (files && files[0]) {
                    this._setValue(files[0]);
                }
            });
        this._openElement = new ToolbarItemElement({ icon: 'folder' })
            .setSmall()
            .onClick(() => {
                FileUtil.openDir(this.getValue());
            });

        this._imageId = getRandomID();
    }

    public override _generateInnerHTML() {
        return `
            <div class="row-container">
                <div class="row-item">
                    <img id="${this._imageId}" class="texture-preview" src="${this.getValue()}" loading="lazy"></img>
                </div>
                <div class="row-item">
                <div class="col-container">
                        <div class="col-item">
                            ${this._switchElement.generateHTML()}
                        </div>
                        <div class="col-item">
                            ${this._openElement.generateHTML()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    public override registerEvents(): void {
        this._switchElement.registerEvents();
        this._openElement.registerEvents();
    }

    protected override _onEnabledChanged(): void {
    }

    protected override _onValueChanged(): void {
        const newPath = this.getValue();
        const parsedPath = path.parse(newPath);

        this._openElement.setEnabled(parsedPath.base !== 'debug.png' && parsedPath.base !== 'debug_alpha.png');
        this._switchElement.setActive(parsedPath.base === 'debug.png' || parsedPath.base === 'debug_alpha.png');

        const imageElement = UIUtil.getElementById(this._imageId) as HTMLImageElement;
        imageElement.src = newPath;
    }

    public override finalise(): void {
        super.finalise();

        this._onValueChanged();
    }
}
