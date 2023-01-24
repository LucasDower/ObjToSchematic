import { shell } from 'electron';

import { AppConfig } from '../../config';
import { ASSERT } from '../../util/error_util';
import { LOG, LOG_ERROR } from '../../util/log_util';
import { AppPaths, PathUtil } from '../../util/path_util';
import { UIUtil } from '../../util/ui_util';
import { BaseUIElement } from './base_element';
import { ToolbarItemElement } from './toolbar_item';


export class HeaderUIElement extends BaseUIElement<HTMLDivElement> {
    private static _instance: HeaderUIElement;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private _githubButton: ToolbarItemElement;
    private _bugButton: ToolbarItemElement;

    private constructor() {
        super();

        this._githubButton = new ToolbarItemElement({ icon: 'github' })
            .onClick(() => {
                shell.openExternal('https://github.com/LucasDower/ObjToSchematic');
            });

        this._bugButton = new ToolbarItemElement({ icon: 'bug' })
            .onClick(() => {
                shell.openExternal('https://github.com/LucasDower/ObjToSchematic/issues');
            });
    }

    // Header element shouldn't be
    protected override _onEnabledChanged(): void {
        return;
    }

    public override generateHTML(): string {
        return `
            <div class="property">
                <div class="col-container header-cols">
                    <div class="col-container">
                        <div class="col-item">
                            <img class="logo" src="${PathUtil.join(AppPaths.Get.static, 'icon.png')}">
                        </div>
                        <div class="col-item">
                            <div class="row-container">
                                <div class="row-item title">
                                    ObjToSchematic
                                </div>
                                <div class="row-item subtitle" id="update-checker">
                                    Up-to-date
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-container">
                        <div class="col-item">
                            ${this._githubButton.generateHTML()}
                        </div>
                        <div class="col-item">
                            ${this._bugButton.generateHTML()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    public override registerEvents(): void {
        this._githubButton.registerEvents();
        this._bugButton.registerEvents();
    }

    public override finalise(): void {
        const updateElement = UIUtil.getElementById('update-checker') as HTMLDivElement;
        updateElement.style.animation = 'pulse-opacity 1.5s infinite';
        updateElement.innerHTML = '<i style="animation: pulse-opacity 1.5s infinite;">Checking for updates...</i>';

        fetch('https://api.github.com/repos/LucasDower/ObjToSchematic/releases/latest')
            .then((response) => response.json())
            .then((data) => {
                const latest: string = data.tag_name; // e.g. v0.7.0
                const versionString = latest.substring(1); // e.g. 0.7.0
                const versionValues = versionString.split('.').map((x) => parseInt(x));

                // Is the local version older than the latest release on GitHub?
                let isGitHubVersionNewer = false;
                if (versionValues[0] > AppConfig.Get.MAJOR_VERSION) {
                    isGitHubVersionNewer = true;
                } else {
                    if (versionValues[1] > AppConfig.Get.MINOR_VERSION) {
                        isGitHubVersionNewer = true;
                    } else {
                        if (versionValues[2] > AppConfig.Get.HOTFIX_VERSION) {
                            isGitHubVersionNewer = true;
                        }
                    }
                }

                /*
                let isLocalVersionNewer = false;
                if (versionValues[0] < AppConfig.Get.MAJOR_VERSION) {
                    isLocalVersionNewer = true;
                } else {
                    if (versionValues[1] < AppConfig.Get.MINOR_VERSION) {
                        isLocalVersionNewer = true;
                    } else {
                        if (versionValues[2] > AppConfig.Get.HOTFIX_VERSION) {
                            isLocalVersionNewer = true;
                        }
                    }
                }
                */

                LOG(`[VERSION]: Current: ${[AppConfig.Get.MAJOR_VERSION, AppConfig.Get.MINOR_VERSION, AppConfig.Get.HOTFIX_VERSION]}, Latest: ${versionValues}`);

                updateElement.style.animation = '';
                if (isGitHubVersionNewer) {
                    updateElement.innerHTML = `<a href="#" id="update-link">New ${versionString} update available!</a>`;

                    const linkElement = UIUtil.getElementById('update-link') as HTMLLinkElement;
                    linkElement.onclick = () => {
                        shell.openExternal('https://github.com/LucasDower/ObjToSchematic/releases/latest');
                    };
                } else {
                    // Either using most up-to-date version or local version is newer (using unreleased dev or alpha build)
                    updateElement.innerHTML = `Version up-to-date!`;
                }
            })
            .catch((error) => {
                LOG_ERROR(error);

                updateElement.style.animation = '';
                updateElement.innerHTML = 'Could not check for updates';
            });
    }
}
