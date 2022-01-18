import { ButtonElement } from './elements/button';
import { OutputElement } from './elements/output';

export interface Group {
    label: string;
    elements: BaseUIElement[];
    submitButton: ButtonElement;
    output: OutputElement;
}
export abstract class BaseUIElement {
    protected _id: string;
    protected _label: string;
    protected _isEnabled: boolean;

    constructor(label: string) {
        this._id = '_' + Math.random().toString(16);
        this._label = label;
        this._isEnabled = true;
    }

    public setEnabled(isEnabled: boolean) {
        this._isEnabled = isEnabled;
        this._onEnabledChanged();
    }

    public abstract generateHTML(): string;
    public abstract registerEvents(): void;

    protected abstract _onEnabledChanged(): void;
}

function buildSubcomp(element: BaseUIElement) {
    return `
        <div class="item item-body">
            ${element.generateHTML()}
        </div>
    `;
}

function buildComponent(componentParams: Group) {
    let innerHTML = '';
    for (const subcomp of componentParams.elements) {
        innerHTML += buildSubcomp(subcomp);
    }

    return `
        ${innerHTML}
        <div class="item item-body">
            <div class="sub-right">
                ${componentParams.submitButton.generateHTML()}
            </div>
        </div>
        <div class="item item-body">
            <div class="sub-right">
                ${componentParams.output.generateHTML()}
            </div>
        </div>
    `;
}

export function registerUI(uiGroups: Group[]) {
    for (const group of uiGroups) {
        for (const comp of group.elements) {
            comp.registerEvents();
        }
        group.submitButton.registerEvents();
    }
}

export function buildUI(myItems: Group[]) {
    let itemHTML = '';
    for (const item of myItems) {
        itemHTML += `
        <div class="item item-body">
            <div class="sub-right">
                <div class="h-div">
                </div>
            </div>
            <div class="sub-left-alt">
                ${item.label.toUpperCase()}
            </div>
            <div class="sub-right">
                <div class="h-div">
                </div>
            </div>
        </div>
      `;
        itemHTML += buildComponent(item);
    }

    document.getElementById('properties')!.innerHTML = `<div class="menu"><div class="container">
    ` + itemHTML + `</div></div>`;
};

export function setEnabled(group: Group, isEnabled: boolean) {
    for (const comp of group.elements) {
        comp.setEnabled(isEnabled);
    }
    group.submitButton.setEnabled(isEnabled);
}
