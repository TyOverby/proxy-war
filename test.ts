import { proxify, isProxySymbol, proxyPathSymbol, apply_mutations, Mutations } from './proxy_war';
import { Store } from './mut';
import { expect } from 'chai';

describe("Reflected Objects", () => {
    it("should be creatable", () => {
        const obj = {};
        const mirror: any = proxify(obj, [], () => { });
        expect(mirror[isProxySymbol]).to.be.true;
        expect(mirror[proxyPathSymbol]).to.deep.equal([]);
    });

    it("should not reflect mutations on fields", () => {
        const obj = { a: 10 };
        const mirror = proxify(obj, [], () => { });
        mirror.mutate(o => o.a = 20);
        expect(obj.a).to.be.equal(10);
    });

    it("should not reflect mutations on arrays", () => {
        const obj = [{ a: 10 }];
        const mirror = proxify(obj, [], () => { });
        mirror.mutate(o => o.push({ a: 20 }));
        expect(obj.length).to.be.equal(1);
    });

    it("should poison nested fields through field access", () => {
        const obj = { inner: {} };
        const mirror = proxify(obj, [], () => { });
        expect(mirror.inner[isProxySymbol]).to.be.true;
        expect(mirror.inner[proxyPathSymbol]).to.deep.equal(["inner"]);
    });

    it("should poison nested array elements through element access", () => {
        const obj = [{}];
        const mirror = proxify(obj, [], () => { });
        expect(mirror[0][isProxySymbol]).to.be.true;
        expect(mirror[0][proxyPathSymbol]).to.deep.equal(["0"]);
    });

    it("should poison nested array elements through forEach", () => {
        const obj = [{}, {}];
        const mirror = proxify(obj, [], () => { });
        (mirror).forEach(a => {
            expect(a[isProxySymbol]).to.be.true;
        });
    });

    it("should poison nested array elements through filter", () => {
        const obj = [{ a: 10 }, { a: 20 }];
        const mutations: Mutations = [];
        const mirror = proxify(obj, [], (p, m) => { mutations.push([p, m]) });
        const filtered = mirror.filter(o => o.a == 10);
        expect(filtered.length).to.be.equal(1);

        filtered[0].mutate(o => o.a = 30);

        apply_mutations(obj, mutations);
        expect(mirror[0].a).to.equal(30);
    });

    it("should poison nested array elements through map", () => {
        const obj = [{ a: 10 }, { a: 20 }];
        const mutations: Mutations = [];
        const mirror = proxify(obj, [], (p, m) => { mutations.push([p, m]) });
        const mapped = mirror.map(o => ({ inner: o }));

        mapped[0].inner.mutate(o => o.a = 30);

        apply_mutations(obj, mutations);
        expect(mirror[0].a).to.equal(30);
    });

    it("should apply actions on field change", () => {
        const obj = { a: 10 };
        const mutations: Mutations = [];
        const mirror = proxify(obj, [], (p, m) => { mutations.push([p, m]) });
        mirror.mutate(o => o.a = 20);

        expect(obj.a).to.be.equal(10);
        expect(mutations.length).to.be.equal(1);

        apply_mutations(obj, mutations);
        expect(obj.a).to.be.equal(20);
    });

    it("should apply mutations on arrays", () => {
        const obj = [{ a: 10 }];
        const mutations: Mutations = [];
        const mirror = proxify(obj, [], (p, m) => { mutations.push([p, m]) });
        mirror.mutate(o => o.push({ a: 20 }));
        expect(obj.length).to.be.equal(1);

        expect(mutations.length).to.be.equal(1);

        apply_mutations(obj, mutations);
        expect(mirror.length).to.be.equal(2);
    });

    it("should apply mutations on arrays", () => {
        const obj = [{ a: 10 }];
        const mutations: Mutations = [];
        const mirror = proxify(obj, [], (p, m) => { mutations.push([p, m]) });
        mirror.mutate(o => o.push({ a: 20 }));
        expect(obj.length).to.be.equal(1);

        expect(mutations.length).to.be.equal(1);

        apply_mutations(obj, mutations);
        expect(mirror.length).to.be.equal(2);
    });

    it("should apply replacements on object at top scope", () => {
        const obj = { a: 10 };
        const mutations: Mutations = [];
        const mirror = proxify(obj, [], (p, m) => { mutations.push([p, m]) });
        mirror.replace({ a: 20 });
        expect(obj.a).to.be.equal(10);

        expect(mutations.length).to.be.equal(1);

        apply_mutations(obj, mutations);
        expect(mirror.a).to.be.equal(20);
    });

    it("should apply replacements on object at nested scope", () => {
        const obj = { a: { b: 10 } };
        const mutations: Mutations = [];
        const mirror = proxify(obj, [], (p, m) => { mutations.push([p, m]) });
        mirror.a.replace({ b: 20 });
        expect(obj.a.b).to.be.equal(10);

        expect(mutations.length).to.be.equal(1);

        apply_mutations(obj, mutations);
        expect(mirror.a.b).to.be.equal(20);
    });

    it("should apply replacements on an array at global scope", () => {
        const obj = [1, 2, 3];
        const mutations: Mutations = [];
        const mirror = proxify(obj, [], (p, m) => { mutations.push([p, m]) });
        mirror.replace([4, 5, 6]);
        expect(obj).to.be.eql([1, 2, 3]);

        expect(mutations.length).to.be.equal(1);

        apply_mutations(obj, mutations);
        expect(mirror).to.be.eql([4, 5, 6]);
    });

    it("should apply replacements on array at nested scope", () => {
        const obj = { a: [1, 2, 3] };
        const mutations: Mutations = [];
        const mirror = proxify(obj, [], (p, m) => { mutations.push([p, m]) });
        mirror.a.replace([4, 5, 6]);
        expect(obj.a).to.be.eql([1, 2, 3]);

        expect(mutations.length).to.be.equal(1);

        apply_mutations(obj, mutations);
        expect(mirror.a).to.be.eql([4, 5, 6]);
    });
});

describe("store", () => {
    it("should apply mutations after flush", () => {
        const store = new Store({ a: 10 });
        const root = store.getRoot();
        root.mutate(r => r.a = 20);

        expect(root.a).to.be.equal(10);
        store.flush();
        expect(root.a).to.be.equal(20);
    });

    it("should allow multiple pointers to the same object", () => {
        type Obj = { x?: { value: number }, y?: { value: number } };
        const store = new Store({} as Obj);
        let root = store.getRoot();
        root.mutate(r => {
            let a = { value: 10 };
            r.x = a;
            r.y = a;
        });

        store.flush();
        expect(root.x.value).that.be.equal(10);
        expect(root.y.value).that.be.equal(10);
    });
});
