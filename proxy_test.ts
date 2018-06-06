import { proxify } from "./proxy_war"

const obj = proxify({ a: 10, b: "hi" }, [], (path, apply) => { });


obj.mutate(o => {
    o.a = 10;
    o.b = "test";
});
