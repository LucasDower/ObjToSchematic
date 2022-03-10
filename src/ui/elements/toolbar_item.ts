import { ASSERT, getRandomID } from '../../util';

import path from 'path';
import fs from 'fs';
import { EAppEvent, EventManager } from '../../event';

export class ToolbarItemElement {
    private _id: string;
    private _iconName: string;
    private _iconPath: string;
    private _isEnabled: boolean;
    private _isActive: boolean;
    private _onClick: () => void;
    
    public constructor(iconName: string, onClick: () => void, _enableChangedEvent?: EAppEvent, _enableChangedDelegate?: (...args: any[]) => boolean, _activeChangedEvent?: EAppEvent, _activeChangedDelegate?: (...args: any[]) => boolean) {
        this._id = getRandomID();
        this._iconName = iconName;
        this._iconPath = path.join(__dirname, '../../../resources/static/', iconName + '.svg');
        this._isEnabled = false;
        this._isActive = false;
        this._onClick = onClick;

        if (_enableChangedEvent !== undefined && _enableChangedDelegate) {
            EventManager.Get.add(_enableChangedEvent, (...args: any[]) => {
                const isActive = _enableChangedDelegate(args);
                this.setActive(isActive);
            });
        }
        
        if (_activeChangedEvent !== undefined && _activeChangedDelegate) {
            EventManager.Get.add(_activeChangedEvent, (...args: any[]) => {
                const isEnabled = _activeChangedDelegate(args);
                this.setEnabled(isEnabled);
            });
        } else {
            this._isEnabled = true;
        }
    }

    public generateHTML() {
        const svg = fs.readFileSync(this._iconPath, 'utf8');
        return `
            <div class="toolbar-item" id="${this._id}">
                ${svg}
            </div>
        `;
    }

    public registerEvents(): void {
        const element = document.getElementById(this._id) as HTMLDivElement;
        ASSERT(element !== null);

        element.addEventListener('click', () => {
            if (this._isEnabled) {
                this._onClick();
            }
        });

        element.addEventListener('mouseenter', () => {
            if (this._isEnabled) {
                element.classList.add('toolbar-item-hover');
            }
        });
        
        element.addEventListener('mouseleave', () => {
            if (this._isEnabled) {
                element.classList.remove('toolbar-item-hover');
            }
        });


        this._onEnabledChanged();
        this._onActiveChanged();
    }

    private _onEnabledChanged() {
        const element = document.getElementById(this._id) as HTMLDivElement;
        const svgElement = document.getElementById(this._iconName + '-svg') as HTMLDivElement;
        ASSERT(element !== null && svgElement !== null);

        if (this._isEnabled) {
            element.classList.remove('toolbar-item-disabled');
            svgElement.classList.remove('icon-disabled');
        } else {
            element.classList.add('toolbar-item-disabled');
            svgElement.classList.add('icon-disabled');
        }
    }

    private _onActiveChanged() {
        const element = document.getElementById(this._id) as HTMLDivElement;
        const svgElement = document.getElementById(this._iconName + '-svg') as HTMLDivElement;
        ASSERT(element !== null && svgElement !== null);

        element.classList.remove('toolbar-item-active');
        svgElement.classList.remove('icon-active');

        if (this._isActive) {
            element.classList.add('toolbar-item-active');
            svgElement.classList.add('icon-active');
        } else {
            element.classList.remove('toolbar-item-active');
            svgElement.classList.remove('icon-active');
        }
    }

    public setEnabled(isEnabled: boolean) {
        this._isEnabled = isEnabled;
        this._onEnabledChanged();
    }

    public setActive(isActive: boolean) {
        this._isActive = isActive;
        this._onActiveChanged();
    }
}
