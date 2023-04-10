// Credits:
// LucasDower

import { TLocaleDefinition } from './base';

export const en_US: TLocaleDefinition = {
    display_name: 'American English',
    language_code: 'en_US',
    translations: {
        init: {
            initialising: 'Initializing...',
        },
        import: {
            invalid_encoding: 'Unrecognized character found, please encode using UTF-8',
        },
        voxelise: {
            heading: '3. VOXELIZE',
            button: 'Voxelize mesh',
            components: {
                colour: 'Color',
            },
        },
        assign: {
            components: {
                colour_accuracy: 'Color accuracy',
            },
        },
    },
};
