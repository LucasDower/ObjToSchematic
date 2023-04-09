import { DeepPartial } from '../src/util/type_util';
import { en_GB } from './en_GB';
import { en_US } from './en_US';

export type TTranslationMap = typeof en_GB.translations;

export type TLocaleDefinition = {
    display_name: string,
    language_code: string,
    translations: DeepPartial<TTranslationMap>,
};

export const locales = [
    en_GB,
    en_US,
];
