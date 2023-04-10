// Credits:
// bookshelfich

import { TLocaleDefinition } from './base';

export const ru_RU: TLocaleDefinition = {
    display_name: 'Russian', // TODO: This should be 'Russian' in Russian not English
    language_code: 'ru_RU',
    translations: {
        import: {
            button: 'Загрузить mesh',
            missing_normals: 'Некоторые вертикали не умеют данных нормалей, это может привести к некорректно ассигнованию вокселей.',
        },
        materials: {
            components: {
                'texture_filtering': 'Текстурный фильтр',
                'linear': 'Линейный',
                'nearest': 'Ближайший',
            },
        },
        voxelise: {
            button: 'Вокселизованный mesh',
            components: {
                algorithm: 'Алгоритм',
                ambient_occlusion: 'Параметр непроходимости окружающей среды',
                multisampling: 'Мультисэмплинг',
                voxel_overlap: 'Нахлёст вокселей',
                ray_based: 'Основано на лучах',
                bvh_ray: 'Основываться на лучах BVH',
                average_recommended: 'Среднее (рекомендуется)',
                first: 'Первый',
            },
        },
        assign: {
            button: 'Назначить блок',
            blocks_missing_textures: '{{count, number}} блоки палитры имеют пропущенные атласы текстур и не будет использоваться.',
            falling_blocks: '{{count, number}} блоки упадёт под действием гравитации при установке.',
            components: {
                texture_atlas: 'Текстурный атлас',
                block_palette: 'Палитра блоков',
                dithering: 'Сглаживание',
                fallable_blocks: 'Падающие блоки',
                colour_accuracy: 'Точность цвета',
                replace_falling: 'Заменять падающие блоки на не падающие',
                replace_fallable: 'Заменять блоки, подверженные падению, на непадающие',
                do_nothing: 'Ничего не делать',
            },
        },
        export: {
            button: 'Экспортировать структуры',
            schematic_unsupported_blocks: '{{count, number}} блоки не поддерживаются форматом .schematic. Блоки камня будет использоваться в этих местах. Попробуйте использовать schematic-friendly палитру, или используете другой экспортёр',
            nbt_exporter_too_big: 'Структурные блоки поддерживают только размер 48x48x48 блоков. Блоки за пределами будут убраны.',
            components: {
                exporter: 'Формат экспорта',
                litematic: 'Файл Litematic (.litematic)',
                schematic: 'Файл схематики (.schematic)',
                sponge_schematic: 'Файл схематики Sponge (.schem)',
                structure_blocks: 'Файл структурного блока (.nbt)',
            },
        },
    },
};
