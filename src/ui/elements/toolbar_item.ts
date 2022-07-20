import { ASSERT, getRandomID, STATIC_DIR } from '../../util';

import path from 'path';
import fs from 'fs';
import { EAppEvent, EventManager } from '../../event';

export type TToolbarBooleanProperty = 'enabled' | 'active';

export class ToolbarItemElement {
    private _id: string;
    private _iconName: string;
    private _iconPath: string;
    private _isEnabled: boolean;
    private _isActive: boolean;
    private _onClick: () => void;
    
    /**
     * 
     * @param iconName The name of the icon for this button
     * @param onClick The function to call when this button is clicked
     * @param _activeChangedEvent The name of the event to listen for to change active state
     * @param _activeChangedDelegate The function to call when the active event has been broadcast
     * @param _enableChangedEvent The name of the event to listen for to change enable state
     * @param _enableChangedDelegate The function to call when the enable event has been broadcast
     */
    public constructor(iconName: string, onClick: () => void,
        _activeChangedEvent?: EAppEvent, _activeChangedDelegate?: (...args: any[]) => boolean,
        _enableChangedEvent?: EAppEvent, _enableChangedDelegate?: (...args: any[]) => boolean,
    ) {
        this._id = getRandomID();
        this._iconName = iconName;
        this._iconPath = path.join(STATIC_DIR, iconName + '.svg');
        this._isEnabled = false;
        this._isActive = false;
        this._onClick = onClick;

        // Enabled/Disabled Event 
        if (_enableChangedEvent !== undefined && _enableChangedDelegate) {
            EventManager.Get.add(_enableChangedEvent, (...args: any[]) => {
                const isEnabled = _enableChangedDelegate(args);
                this.setEnabled(isEnabled);
            });
        } else {
            this._isEnabled = true;
        }
        
        // Active/Inactive Event
        if (_activeChangedEvent !== undefined && _activeChangedDelegate) {
            EventManager.Get.add(_activeChangedEvent, (...args: any[]) => {
                const isActive = _activeChangedDelegate(args);
                this.setActive(isActive);
            });
        }
    }

    public on(event: EAppEvent, prop: TToolbarBooleanProperty, delegate: (...args: any[]) => boolean) {
        EventManager.Get.add(event, (...args: any[]) => {
            const bool = delegate(args);
            if (prop === 'active') {
                this.setActive(bool);
            } else {
                this.setEnabled(bool);
            }
        });
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

        this._updateElements();
    }

    private _updateElements() {
        const element = document.getElementById(this._id) as HTMLDivElement;
        const svgElement = document.getElementById(this._iconName + '-svg') as HTMLDivElement;
        ASSERT(element !== null && svgElement !== null);

        element.classList.remove('toolbar-item-disabled');
        element.classList.remove('toolbar-item-active');
        svgElement.classList.remove('icon-disabled');
        svgElement.classList.remove('icon-active');

        if (this._isEnabled) {
            if (this._isActive) {
                element.classList.add('toolbar-item-active');
                svgElement.classList.add('icon-active');
            }
        } else {
            element.classList.add('toolbar-item-disabled');
            svgElement.classList.add('icon-disabled');
        }
    }

    public setEnabled(isEnabled: boolean) {
        this._isEnabled = isEnabled;
        this._updateElements();
    }

    public setActive(isActive: boolean) {
        this._isActive = isActive;
        this._updateElements();
    }
}
