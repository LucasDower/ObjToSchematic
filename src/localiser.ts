import i18next from 'i18next';

import { locales, TTranslationMap } from '../loc/base';
import { AppConfig } from './config';
import { EAppEvent, EventManager } from './event';
import { ASSERT } from './util/error_util';
import { DeepPartial, TBrand } from './util/type_util';


// https://stackoverflow.com/questions/58277973/how-to-type-check-i18n-dictionaries-with-typescript
// get all possible key paths
export type DeepKeys<T> = T extends object ? {
    [K in keyof T]-?: `${K & string}` | Concat<K & string, DeepKeys<T[K]>>
}[keyof T] : '';

// or: only get leaf and no intermediate key path
export type DeepLeafKeys<T> = T extends object ?
    { [K in keyof T]-?: Concat<K & string, DeepKeys<T[K]>> }[keyof T] : '';

// https://stackoverflow.com/questions/58277973/how-to-type-check-i18n-dictionaries-with-typescript
export type Concat<K extends string, P extends string> =
    `${K}${'' extends P ? '' : '.'}${P}`

export type TLocalisedString = TBrand<string, 'loc'>;

export type TLocalisedKey = DeepLeafKeys<TTranslationMap>;

export class Localiser {
    /* Singleton */
    private static _instance: Localiser;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    public async init() {
        const localResources: { [code: string]: { translation: DeepPartial<TTranslationMap> } } = {};
        locales.forEach((locale) => {
            localResources[locale.language_code] = { translation: locale.translations };
        });

        await i18next.init({
            lng: AppConfig.Get.LOCALE,
            fallbackLng: 'en-GB',
            debug: true,
            resources: localResources,
        });

        ASSERT(i18next.isInitialized, 'i18next not initialised');
    }

    public async changeLanguage(languageKey: string) {
        await i18next.changeLanguage(languageKey);
        EventManager.Get.broadcast(EAppEvent.onLanguageChanged);
    }

    public translate(p: DeepLeafKeys<TTranslationMap>, options?: any): TLocalisedString {
        return (i18next.t(p, options) as unknown) as TLocalisedString;
    }

    public getCurrentLanguage() {
        return i18next.language;
    }
}

export const LOC = Localiser.Get.translate;
