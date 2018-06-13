import { proxify, Mut } from "./proxy_war"
import { DeepReadonly } from "./deep_readonly";

const obj = proxify({ a: 10, b: "hi", c: new Set([1, 2, 3, 3]) }, [], (path, apply) => { });

obj.mutate(o => {
    o.a = 10;
    o.b = "test";
    o.c.add(10);
});

function take(x: ReadonlySet<number>) {

}

const bad = proxify([1, 2, 3], [], (path, apply) => { });

type Foo = {
    a: string,
    b: number[],
};

const mut: Mut<Foo> = proxify({a: "hi", b: [1,2,3]}, [], (path, apply) => { });
const imm: DeepReadonly<Foo> = mut;
