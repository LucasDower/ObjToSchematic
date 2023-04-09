import { en_GB } from './en_GB';
import { en_US } from './en_US';

export type TTranslationMap = typeof en_GB;

export const locales = {
    en_GB: { translation: en_GB },
    en_US: { translation: en_US },
};

export type TLocales = keyof typeof locales;
