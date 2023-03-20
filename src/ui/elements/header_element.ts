import IMAGE_LOGO from '../../../res/static/icon.png';
import { AppConfig } from '../../config';
import { LOG, LOG_ERROR } from '../../util/log_util';
import { AppPaths, PathUtil } from '../../util/path_util';
import { UIUtil } from '../../util/ui_util';
import { AppIcons } from '../icons';
import { BaseUIElement } from './base_element';
import { ToolbarItemElement } from './toolbar_item';

export class HeaderUIElement extends BaseUIElement<HTMLDivElement> {
    private static _instance: HeaderUIElement;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private _githubButton: ToolbarItemElement;
    private _bugButton: ToolbarItemElement;
    private _discordButton: ToolbarItemElement;

    private constructor() {
        super();

        this._githubButton = new ToolbarItemElement({ id: 'gh', iconSVG: AppIcons.GITHUB })
            .onClick(() => {
                window.open('https://github.com/LucasDower/ObjToSchematic');
            });

        this._bugButton = new ToolbarItemElement({ id: 'bug', iconSVG: AppIcons.BUG })
            .onClick(() => {
                window.open('https://github.com/LucasDower/ObjToSchematic/issues');
            });

        this._discordButton = new ToolbarItemElement({ id: 'disc', iconSVG: AppIcons.DISCORD })
            .onClick(() => {
                window.open('https://discord.gg/McS2VrBZPD');
            });
    }

    // Header element shouldn't be
    protected override _onEnabledChanged(): void {
        return;
    }

    public override generateHTML(): string {
        return `
            <div class="container-header">
                <div class="col-container header-cols">
                    <div class="col-container">
                        <div class="col-item">
                            <img class="logo" alt="Logo" src="${IMAGE_LOGO}">
                        </div>
                        <div class="col-item">
                            <div class="row-container">
                                <div class="row-item title">
                                    ObjToSchematic
                                </div>
                                <div class="row-item subtitle">
                                    v${AppConfig.Get.MAJOR_VERSION}.${AppConfig.Get.MINOR_VERSION}.${AppConfig.Get.HOTFIX_VERSION}${AppConfig.Get.VERSION_TYPE} • Minecraft ${AppConfig.Get.MINECRAFT_VERSION}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-container toolbar-group" style="gap: 0px;">
                        ${this._githubButton.generateHTML()}
                        ${this._bugButton.generateHTML()}
                        ${this._discordButton.generateHTML()}
                    </div>
                </div>
            </div>
        `;
    }

    public override registerEvents(): void {
        this._githubButton.registerEvents();
        this._bugButton.registerEvents();
        this._discordButton.registerEvents();
    }

    public override finalise(): void {
        this._githubButton.finalise();
        this._bugButton.finalise();
        this._discordButton.finalise();
        // const updateElement = UIUtil.getElementById('update-checker') as HTMLDivElement;
        // updateElement.style.animation = 'pulse-opacity 1.5s infinite';
        // updateElement.innerHTML = '<i style="animation: pulse-opacity 1.5s infinite;">Checking for updates...</i>';

        // fetch('https://api.github.com/repos/LucasDower/ObjToSchematic/releases/latest')
        //     .then((response) => response.json())
        //     .then((data) => {
        //         const latest: string = data.tag_name; // e.g. v0.7.0
        //         const versionString = latest.substring(1); // e.g. 0.7.0
        //         const versionValues = versionString.split('.').map((x) => parseInt(x));

        //         // Is the local version older than the latest release on GitHub?
        //         let isGitHubVersionNewer = false;
        //         if (versionValues[0] > AppConfig.Get.MAJOR_VERSION) {
        //             isGitHubVersionNewer = true;
        //         } else {
        //             if (versionValues[1] > AppConfig.Get.MINOR_VERSION) {
        //                 isGitHubVersionNewer = true;
        //             } else {
        //                 if (versionValues[2] > AppConfig.Get.HOTFIX_VERSION) {
        //                     isGitHubVersionNewer = true;
        //                 }
        //             }
        //         }

        //         /*
        //         let isLocalVersionNewer = false;
        //         if (versionValues[0] < AppConfig.Get.MAJOR_VERSION) {
        //             isLocalVersionNewer = true;
        //         } else {
        //             if (versionValues[1] < AppConfig.Get.MINOR_VERSION) {
        //                 isLocalVersionNewer = true;
        //             } else {
        //                 if (versionValues[2] > AppConfig.Get.HOTFIX_VERSION) {
        //                     isLocalVersionNewer = true;
        //                 }
        //             }
        //         }
        //         */

        //         LOG(`[VERSION]: Current: ${[AppConfig.Get.MAJOR_VERSION, AppConfig.Get.MINOR_VERSION, AppConfig.Get.HOTFIX_VERSION]}, Latest: ${versionValues}`);

        //         updateElement.style.animation = '';
        //         if (isGitHubVersionNewer) {
        //             updateElement.innerHTML = `<a href="#" id="update-link">New ${versionString} update available!</a>`;

        //             const linkElement = UIUtil.getElementById('update-link') as HTMLLinkElement;
        //             linkElement.onclick = () => {
        //                 window.open('https://github.com/LucasDower/ObjToSchematic/releases/latest');
        //             };
        //         } else {
        //             // Either using most up-to-date version or local version is newer (using unreleased dev or alpha build)
        //             updateElement.innerHTML = `Version up-to-date!`;
        //         }
        //     })
        //     .catch((error) => {
        //         LOG_ERROR(error);

        //         updateElement.style.animation = '';
        //         updateElement.innerHTML = 'Could not check for updates';
        //     });
    }
}
