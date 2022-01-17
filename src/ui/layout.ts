import { ButtonElement } from './elements/button';
import { LabelElement } from './elements/label';
import { OutputElement } from './elements/output';

export interface Group {
    label: string;
    components: Component[];
    submitButton: ButtonElement;
    output: OutputElement;
}

export interface Component {
    label: LabelElement;
    type: BaseUIElement;
}

export abstract class BaseUIElement {
    protected _id: string;
    protected _isEnabled: boolean;

    constructor(id: string) {
        this._id = id;
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

function buildSubcomp(subcomp: Component) {
    return `
        <div class="item item-body">
            ${subcomp.label.generateHTML()}
            <div class="divider"></div>
            <div class="sub-right">
                ${subcomp.type.generateHTML()}
            </div>
        </div>
    `;
}

function buildComponent(componentParams: Group) {
    let innerHTML = '';
    for (const subcomp of componentParams.components) {
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
        for (const comp of group.components) {
            comp.type.registerEvents();
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
    for (const comp of group.components) {
        comp.type.setEnabled(isEnabled);
        comp.label.setEnabled(isEnabled);
    }
    group.submitButton.setEnabled(isEnabled);
}
