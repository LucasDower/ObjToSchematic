import { RegExpBuilder, REGEX_NUMBER, REGEX_NZ_ANY } from '../src/util/regex_util';
import { ASSERT } from '../src/util/error_util';

test('RegExpBuilder', () => {
    const regex = new RegExpBuilder()
        .add(/hello/)
        .toRegExp();
    expect(regex.test('hello')).toBe(true);
    expect(regex.test('there')).toBe(false);
});

test('RegExpBuilder REGEX_NUMBER', () => {
    const tests = [
        { f: '0', s: 0 },
        { f: '0.0', s: 0.0 },
        { f: '-0.0', s: -0.0 },
        { f: '1', s: 1 },
        { f: '1.0', s: 1.0 },
        { f: '-1.0', s: -1.0 },
    ];
    for (const t of tests) {
        const temp = REGEX_NUMBER.exec(t.f);
        ASSERT(temp !== null);
        expect(parseFloat(temp[0])).toEqual(t.s);
    }
});

test('RegExpBuilder Required-whitespace', () => {
    const regex = new RegExpBuilder()
        .add(/hello/)
        .addNonzeroWhitespace()
        .add(/there/)
        .toRegExp();
    expect(regex.test('hello there')).toBe(true);
    expect(regex.test('hello   there')).toBe(true);
    expect(regex.test('hellothere')).toBe(false);
});

test('RegExpBuilder Optional', () => {
    const regex = new RegExpBuilder()
        .add(/hello/)
        .addNonzeroWhitespace()
        .addMany([/there/], true)
        .toRegExp();
    expect(regex.test('hello there')).toBe(true);
    expect(regex.test('hello   there')).toBe(true);
    expect(regex.test('hello   ')).toBe(true);
    expect(regex.test('hello')).toBe(false);
});

test('RegExpBuilder Capture', () => {
    const regex = new RegExpBuilder()
        .add(/[0-9]+/, 'myNumber')
        .toRegExp();
    const exec = regex.exec('1234');
    expect(exec).toHaveProperty('groups');
    if (exec !== null && exec.groups) {
        expect(exec.groups).toHaveProperty('myNumber');
        expect(exec.groups['myNumber']).toBe('1234');
    }
});

test('RegExpBuilder Capture-multiple', () => {
    const regex = new RegExpBuilder()
        .add(/[0-9]+/, 'x')
        .addNonzeroWhitespace()
        .add(/[0-9]+/, 'y')
        .addNonzeroWhitespace()
        .add(/[0-9]+/, 'z')
        .toRegExp();

    const exec = regex.exec('123 456 789');
    expect(exec).toHaveProperty('groups');
    if (exec !== null && exec.groups) {
        expect(exec.groups).toHaveProperty('x');
        expect(exec.groups).toHaveProperty('y');
        expect(exec.groups).toHaveProperty('z');
        expect(exec.groups['x']).toBe('123');
        expect(exec.groups['y']).toBe('456');
        expect(exec.groups['z']).toBe('789');
    }
});

test('RegExpBuilder Capture-multiple', () => {
    const regex = new RegExpBuilder()
        .add(/f/)
        .addNonzeroWhitespace()
        .add(REGEX_NUMBER, 'xIndex').addMany(['/'], true).add(REGEX_NUMBER, 'xtIndex', true).addMany(['/', REGEX_NUMBER], true)
        .addNonzeroWhitespace()
        .add(REGEX_NUMBER, 'yIndex').addMany(['/'], true).add(REGEX_NUMBER, 'ytIndex', true).addMany(['/', REGEX_NUMBER], true)
        .addNonzeroWhitespace()
        .add(REGEX_NUMBER, 'zIndex').addMany(['/'], true).add(REGEX_NUMBER, 'ztIndex', true).addMany(['/', REGEX_NUMBER], true)
        .toRegExp();

    let exec = regex.exec('f 1/2/3 4/5/6 7/8/9');
    expect(exec).toHaveProperty('groups');
    if (exec !== null && exec.groups) {
        expect(exec.groups['xIndex']).toBe('1');
        expect(exec.groups['xtIndex']).toBe('2');
        expect(exec.groups['yIndex']).toBe('4');
        expect(exec.groups['ytIndex']).toBe('5');
        expect(exec.groups['zIndex']).toBe('7');
        expect(exec.groups['ztIndex']).toBe('8');
    }

    exec = regex.exec('f 1//3 4//6 7//9');
    expect(exec).toHaveProperty('groups');
    if (exec !== null && exec.groups) {
        expect(exec.groups['xIndex']).toBe('1');
        expect(exec.groups['xtIndex']).toBeUndefined();
        expect(exec.groups['yIndex']).toBe('4');
        expect(exec.groups['ytIndex']).toBeUndefined();
        expect(exec.groups['zIndex']).toBe('7');
        expect(exec.groups['ztIndex']).toBeUndefined();
    }

    exec = regex.exec('f 1 4 7');
    expect(exec).toHaveProperty('groups');
    if (exec !== null && exec.groups) {
        expect(exec.groups['xIndex']).toBe('1');
        expect(exec.groups['yIndex']).toBe('4');
        expect(exec.groups['zIndex']).toBe('7');
    }
});

test('RegExpBuilder Capture-multiple', () => {
    const regex = new RegExpBuilder()
        .add(/usemtl/)
        .add(/ /)
        .add(REGEX_NZ_ANY, 'path')
        .toRegExp();

    const exec = regex.exec('usemtl hellothere.txt');
    expect(exec).toHaveProperty('groups');
    if (exec !== null && exec.groups) {
        expect(exec.groups['path']).toBe('hellothere.txt');
    }
});
