import { DeepPartial } from '../src/util/type_util';
import { en_GB } from './en_GB';
import { en_US } from './en_US';
import { es_ES } from './es_ES';
import { fr_FR } from './fr_FR';
import { ru_RU } from './ru_RU';
import { zh_CN } from './zh_CN';
import { zh_TW } from './zh_TW';
import { ja_JP } from './ja_JP';

export type TTranslationMap = typeof en_GB.translations;

export type TLocaleDefinition = {
    display_name: string,
    language_code: string,
    translations: DeepPartial<TTranslationMap>,
};

export const locales = [
    en_GB,
    en_US,
    es_ES,
    ru_RU,
    zh_CN,
    zh_TW,
    fr_FR,
    ja_JP,
];
