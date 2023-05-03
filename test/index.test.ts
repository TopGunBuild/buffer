import Buffer from '../src/browser';

describe('Buffer', () => {
    it('indexes from a string', async () =>
    {
        const buf = Buffer.from('abc');
        expect(buf[0]).toEqual(97);
        expect(buf[1]).toEqual(98);
        expect(buf[2]).toEqual(99);
    });

    it('indexes from an array', async () =>
    {
        const buf = Buffer.from([97, 98, 99]);
        expect(buf[0]).toEqual(97);
        expect(buf[1]).toEqual(98);
        expect(buf[2]).toEqual(99);
    });

    it('setting index value should modify buffer contents', async () =>
    {
        const buf = Buffer.from([97, 98, 99]);
        expect(buf[2]).toEqual(99);
        expect(buf.toString()).toEqual('abc');

        buf[2] += 10;
        expect(buf[2]).toEqual(109);
        expect(buf.toString()).toEqual('abm');
    });

    it('test that memory is copied from array-like', async () =>
    {
        const u = new Uint8Array(4);
        const b = Buffer.from(u);
        b[0]    = 1;
        b[1]    = 2;
        b[2]    = 3;
        b[3]    = 4;

        expect(u[0]).toEqual(0);
        expect(u[1]).toEqual(0);
        expect(u[2]).toEqual(0);
        expect(u[3]).toEqual(0);
    });

    it('detect utf16 surrogate pairs', async () =>
    {
        const text = '\uD83D\uDE38' + '\uD83D\uDCAD' + '\uD83D\uDC4D';
        const buf = Buffer.from(text);

        expect(text).toEqual(buf.toString());
    });

    it('alloc', async () =>
    {
        const data = Buffer.alloc(5);

        expect(data.length).toEqual(5);
    });
});
