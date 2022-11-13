import { remote } from 'electron';
import path from 'path';

import { AppContext } from '../../app_context';
import { RGBAUtil } from '../../colour';
import { SolidMaterial, TexturedMaterial } from '../../mesh';
import { getRandomID } from '../../util';
import { ASSERT } from '../../util/error_util';
import { FileUtil } from '../../util/file_util';

export abstract class MaterialUIElement {
    protected readonly _materialName: string;
    protected readonly _appContext: AppContext;
    private _actions: { text: string, onClick: () => void, id: string }[];
    private _metadata: string[];

    public constructor(materialName: string, appContext: AppContext) {
        this._materialName = materialName;
        this._appContext = appContext;
        this._actions = [];
        this._metadata = [];
    }

    public hasWarning() {
        return false;
    }

    public buildHTML(): string {
        let html = `<div class="material-container">`;
        html += this.buildChildHTML();
        this._metadata.forEach((data) => {
            html += `<br>${data}`;
        });
        this._actions.forEach((action) => {
            html += `<br><a id="${action.id}">[${action.text}]</a>`;
        });
        html += `</div>`;
        return html;
    }

    public registerEvents() {
        this._actions.forEach((action) => {
            const element = document.getElementById(action.id);
            if (element !== null) {
                element.addEventListener('click', () => {
                    action.onClick();
                });
            }
        });
    }

    public addAction(text: string, onClick: () => void) {
        this._actions.push({ text: text, onClick: onClick, id: getRandomID() });
    }

    public addMetadata(text: string) {
        this._metadata.push(text);
    }

    protected abstract buildChildHTML(): string
}

export class TextureMaterialUIElement extends MaterialUIElement {
    private _material: TexturedMaterial;
    private _diffuseImageId: string;
    private _alphaImageId: string;

    public constructor(materialName: string, appContext: AppContext, material: TexturedMaterial) {
        super(materialName, appContext);
        this._material = material;
        this._diffuseImageId = getRandomID();
        this._alphaImageId = getRandomID();

        const parsedPath = path.parse(material.path);
        const isMissingTexture = parsedPath.base === 'debug.png';

        super.addAction(isMissingTexture ? 'Find texture' : 'Replace texture', () => {
            const files = remote.dialog.showOpenDialogSync({
                title: 'Load',
                buttonLabel: 'Load',
                filters: [{
                    name: 'Images',
                    extensions: ['png', 'jpeg', 'jpg'],
                }],
            });
            if (files && files[0]) {
                this._appContext.onMaterialTextureReplace(materialName, files[0]);
            }
        });

        super.addAction('Switch to colour', () => {
            this._appContext.onMaterialTypeSwitched(materialName);
        });

        super.addMetadata(`Alpha multiplier: ${this._material.alphaFactor}`);
        if (this._material.alphaPath !== undefined) {
            super.addMetadata(`Alpha texture: ${this._material.alphaPath}`);
        }
    }

    private _isMissingTexture() {
        const parsedPath = path.parse(this._material.path);
        const isMissingTexture = parsedPath.base === 'debug.png';
        return isMissingTexture;
    }

    public hasWarning(): boolean {
        return this._isMissingTexture();
    }

    protected buildChildHTML(): string {
        let html = `<img id="${this._diffuseImageId}" class="texture-preview" src="${this._material.path}" width="75%" loading="lazy"></img>`;
        if (this._material.alphaPath !== undefined) {
            html += `<br><img id="${this._alphaImageId}" class="texture-preview" src="${this._material.alphaPath}" width="75%" loading="lazy"></img>`;
        }
        return html;
    }

    public registerEvents(): void {
        super.registerEvents();

        {
            const element = document.getElementById(this._diffuseImageId) as HTMLLinkElement;
            if (element) {
                if (!this._isMissingTexture()) {
                    element.addEventListener('mouseover', () => {
                        element.classList.add('texture-hover');
                    });
                    element.addEventListener('mouseleave', () => {
                        element.classList.remove('texture-hover');
                    });
                    element.addEventListener('click', () => {
                        FileUtil.openDir(this._material.path);
                    });
                } else {
                    element.classList.add('texture-preview-missing');
                }
            }
        }
        {
            const element = document.getElementById(this._alphaImageId) as HTMLLinkElement;
            if (element) {
                if (!this._isMissingTexture()) {
                    element.addEventListener('mouseover', () => {
                        element.classList.add('texture-hover');
                    });
                    element.addEventListener('mouseleave', () => {
                        element.classList.remove('texture-hover');
                    });
                    element.addEventListener('click', () => {
                        ASSERT(this._material.alphaPath !== undefined);
                        FileUtil.openDir(this._material.alphaPath);
                    });
                } else {
                    element.classList.add('texture-preview-missing');
                }
            }
        }
    }
}

export class SolidMaterialUIElement extends MaterialUIElement {
    private _material: SolidMaterial;
    private _colourId: string;

    public constructor(materialName: string, appContext: AppContext, material: SolidMaterial) {
        super(materialName, appContext);
        this._material = material;
        this._colourId = getRandomID();

        if (material.canBeTextured) {
            super.addAction('Switch to texture', () => {
                this._appContext.onMaterialTypeSwitched(materialName);
            });
        }

        this.addMetadata(`Alpha multiplier: ${this._material.colour.a}`);
    }

    protected buildChildHTML(): string {
        return `<input class="colour-swatch" type="color" id="${this._colourId}" value="${RGBAUtil.toHexString(this._material.colour)}">`;
    }

    public hasWarning(): boolean {
        return !this._material.set;
    }

    public registerEvents(): void {
        super.registerEvents();

        const colourElement = document.getElementById(this._colourId) as (HTMLInputElement | null);
        if (colourElement !== null) {
            colourElement.addEventListener('change', () => {
                const newColour = RGBAUtil.fromHexString(colourElement.value);
                newColour.a = this._material.colour.a;
                this._appContext.onMaterialColourChanged(this._materialName, newColour);
            });

            colourElement.addEventListener('mouseenter', () => {
                colourElement.classList.add('colour-swatch-hover');
            });

            colourElement.addEventListener('mouseleave', () => {
                colourElement.classList.remove('colour-swatch-hover');
            });
        }
    }
}
