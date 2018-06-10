import { proxify } from "./proxy_war"

const obj = proxify({ a: 10, b: "hi", c: new Set([1, 2, 3, 3]) }, [], (path, apply) => { });

obj.mutate(o => {
    o.a = 10;
    o.b = "test";
});

const bad = proxify([1, 2, 3], [], (path, apply) => { });
