export {};

describe('Dummy group', () => {
    it('dummy test', async () => {
        expect(1).toBeDefined();
    });

    it('another dummy test', () => {
        expect(true).toBe(true);
    });

    it('dummy test with a string', () => {
        const str = "hello";
        expect(str).toEqual("hello");
    });

    it('dummy test with an object', () => {
        const obj = { a: 1, b: "test" };
        expect(obj).toHaveProperty('a');
        expect(obj.b).toBe("test");
    });
});

describe('Another Dummy group', () => {
    beforeEach(() => {
        // console.log('Before each test in Another Dummy group');
    });

    it('dummy test in another group', () => {
        expect(null).toBeNull();
    });

    it('dummy test checking for undefined', () => {
        let a;
        expect(a).toBeUndefined();
    });
});