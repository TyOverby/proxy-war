import { proxyify_any, isProxySymbol, proxyPathSymbol, apply_mutations } from './proxy_war';
import { expect } from 'chai';

describe("Reflected Objects", () => {
    it("should be creatable", () => {
        const obj = {};
        const mirror = proxyify_any(obj, [], () => { });
        expect(mirror[isProxySymbol]).to.be.true;
        expect(mirror[proxyPathSymbol]).to.deep.equal([]);
    });

    it("should not reflect mutations on fields", () => {
        const obj = { a: 10 };
        const mirror = proxyify_any(obj, [], () => { });
        mirror.mutate(o => o.a = 20);
        expect(obj.a).to.be.equal(10);
    });

    it("should not reflect mutations on arrays", () => {
        const obj = [{ a: 10 }];
        const mirror = proxyify_any(obj, [], () => { });
        mirror.mutate(o => o.push({ a: 20 }));
        expect(obj.length).to.be.equal(1);
    });

    it("should poison nested fields through field access", () => {
        const obj = { inner: {} };
        const mirror = proxyify_any(obj, [], () => { });
        expect(mirror.inner[isProxySymbol]).to.be.true;
        expect(mirror.inner[proxyPathSymbol]).to.deep.equal(["inner"]);
    });

    it("should poison nested array elements through element access", () => {
        const obj = [{}];
        const mirror = proxyify_any(obj, [], () => { });
        expect(mirror[0][isProxySymbol]).to.be.true;
        expect(mirror[0][proxyPathSymbol]).to.deep.equal(["0"]);
    });

    it("should poison nested array elements through methods", () => {
        const obj = [{}, {}];
        const mirror = proxyify_any(obj, [], () => { });
        mirror.forEach(a => {
            expect(a[isProxySymbol]).to.be.true;
        });
    });

    it("should apply actions on field change", () => {
        const obj = { a: 10 };
        const mutations = [];
        const mirror = proxyify_any(obj, [], (p, m) => { mutations.push([p, m]) });
        mirror.mutate(o => o.a = 20);

        expect(obj.a).to.be.equal(10);
        expect(mutations.length).to.be.equal(1);

        apply_mutations(obj, mutations);
        expect(obj.a).to.be.equal(20);
    });
});
