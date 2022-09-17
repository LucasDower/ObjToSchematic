import { AttributeData, MergeAttributeData } from '../src/render_buffer';
import { TEST_PREAMBLE } from './preamble';

test('MergeAttributeData #1', () => {
    TEST_PREAMBLE();

    const a: AttributeData = {
        indices: new Uint32Array([0, 1, 2]),
        custom: {
            position: [1, 2, 3, 4, 5, 6, 7, 8, 9],
            colour: [1, 0, 0, 0, 1, 0, 0, 0, 1],
        },
    };
    const b = MergeAttributeData(a);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
});

test('MergeAttributeData #2', () => {
    TEST_PREAMBLE();

    const a: AttributeData = {
        indices: new Uint32Array([0, 1, 2]),
        custom: {
            position: [1, 2, 3, 4, 5, 6, 7, 8, 9],
            colour: [1, 0, 0, 0, 1, 0, 0, 0, 1],
        },
    };
    const b: AttributeData = {
        indices: new Uint32Array([0, 1, 2]),
        custom: {
            position: [10, 11, 12, 13, 14, 15, 16, 17, 18],
            colour: [0, 1, 1, 1, 0, 1, 1, 1, 0],
        },
    };
    const cActual = MergeAttributeData(a, b);
    const cExpect: AttributeData = {
        indices: new Uint32Array([0, 1, 2, 3, 4, 5]),
        custom: {
            position: [
                1, 2, 3, 4, 5, 6, 7, 8, 9,
                10, 11, 12, 13, 14, 15, 16, 17, 18,
            ],
            colour: [
                1, 0, 0, 0, 1, 0, 0, 0, 1,
                0, 1, 1, 1, 0, 1, 1, 1, 0,
            ],
        },
    };
    expect(JSON.stringify(cActual)).toEqual(JSON.stringify(cExpect));
});

test('MergeAttributeData #3', () => {
    TEST_PREAMBLE();

    const a: AttributeData = {
        indices: new Uint32Array([0, 1]),
        custom: {
            data: [1, 2],
        },
    };
    const b: AttributeData = {
        indices: new Uint32Array([0, 1]),
        custom: {
            data: [3, 4],
        },
    };
    const c: AttributeData = {
        indices: new Uint32Array([0, 1]),
        custom: {
            data: [5, 6],
        },
    };
    const dActual = MergeAttributeData(a, b, c);
    const dExpect: AttributeData = {
        indices: new Uint32Array([0, 1, 2, 3, 4, 5]),
        custom: {
            data: [1, 2, 3, 4, 5, 6],
        },
    };
    expect(JSON.stringify(dActual)).toEqual(JSON.stringify(dExpect));
});
