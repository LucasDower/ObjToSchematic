import i18next from 'i18next';
import Backend from 'i18next-fs-backend';

import { AppConfig } from './config';
import { EAppEvent, EventManager } from './event';
import { ASSERT } from './util/error_util';
import { AppPaths, PathUtil } from './util/path_util';
import { TLocString } from './util/type_util';

export class Localiser {
    /* Singleton */
    private static _instance: Localiser;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    private _beganInit: boolean;
    private _setup: boolean;

    private constructor() {
        this._beganInit = false;
        this._setup = false;
    }

    public isSetup() {
        return this._setup;
    }

    public async init() {
        if (!this._beganInit) {
            this._beganInit = true;
            await i18next
                .use(Backend)
                .init({
                    backend: {
                        loadPath: PathUtil.join(AppPaths.Get.base, '/locales/{{lng}}/translation.json'),
                    },
                    fallbackLng: 'en-GB',
                    debug: AppConfig.Get.LOCALISE_DEBUG,
                    pluralSeparator: ':',
                    returnEmptyString: false,
                });

            await i18next.changeLanguage(AppConfig.Get.LOCALE).then(() => {
                this._setup = true;
                EventManager.Get.broadcast(EAppEvent.onLocaliserReady);
            });
        }
    }

    public t(key: any, options?: any): TLocString {
        if (this._setup) {
            return i18next.t(key, options);
        } else {
            return key;
        }
    }
}

export const LOC = Localiser.Get;
