import { Palette } from '../src/palette';

test('Palette', () => {
    const myPalette = Palette.create();
    myPalette.add(['minecraft:stone']);
    expect(myPalette.count()).toBe(1);
    myPalette.remove('minecraft:stone');
    expect(myPalette.count()).toBe(0);
});
