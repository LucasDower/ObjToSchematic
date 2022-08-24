import { IBlockAssigner } from './base_assigner';
import { BasicBlockAssigner } from './basic_assigner';
import { OrderedDitheringBlockAssigner } from './ordered_dithering_assigner';
import { RandomDitheringBlockAssigner } from './random_dithering_assigner';

export type TBlockAssigners = 'basic' | 'ordered-dithering' | 'random-dithering';

export class BlockAssignerFactory {
    public static GetAssigner(blockAssigner: TBlockAssigners): IBlockAssigner {
        switch (blockAssigner) {
            case 'basic':
                return new BasicBlockAssigner();
            case 'ordered-dithering':
                return new OrderedDitheringBlockAssigner();
            case 'random-dithering':
                return new RandomDitheringBlockAssigner();
        }
    }
}
