import i18next from 'i18next';

import { locales, TTranslationMap } from '../loc/base';
import { AppConfig } from './config';
import { ASSERT } from './util/error_util';
import { TBrand } from './util/type_util';


// https://stackoverflow.com/questions/58277973/how-to-type-check-i18n-dictionaries-with-typescript
// get all possible key paths
type DeepKeys<T> = T extends object ? {
    [K in keyof T]-?: `${K & string}` | Concat<K & string, DeepKeys<T[K]>>
}[keyof T] : '';

// or: only get leaf and no intermediate key path
type DeepLeafKeys<T> = T extends object ?
    { [K in keyof T]-?: Concat<K & string, DeepKeys<T[K]>> }[keyof T] : '';

// https://stackoverflow.com/questions/58277973/how-to-type-check-i18n-dictionaries-with-typescript
type Concat<K extends string, P extends string> =
    `${K}${'' extends P ? '' : '.'}${P}`

export type TLocalisedString = TBrand<string, 'loc'>;

export class Localiser {
    /* Singleton */
    private static _instance: Localiser;
    public static get Get() {
        return this._instance || (this._instance = new this());
    }

    public async init() {
        await i18next.init({
            lng: AppConfig.Get.LOCALE,
            fallbackLng: 'en_GB',
            debug: true,
            resources: locales,
        });
        ASSERT(i18next.isInitialized, 'i18next not initialised');
    }

    public translate<P extends DeepLeafKeys<TTranslationMap>>(p: P, options?: any): TLocalisedString {
        return (i18next.t(p, options) as unknown) as TLocalisedString;
    }
}

export const LOC = Localiser.Get.translate;
