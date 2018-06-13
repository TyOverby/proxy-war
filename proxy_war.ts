import { DeepReadonly } from "./deep_readonly";

export type OnMutate = (path: Path, apply: Action) => void;

export type NonFunctionPropertyNames<T> = {
    [P in keyof T]: T[P] extends Function ? never : P;
}[keyof T];

export const isProxySymbol = Symbol();
export const proxyPathSymbol = Symbol();

export type Mut<T> =
    (T extends number ? number :
        T extends string ? string :
        T extends boolean ? boolean :
        T extends null ? null :
        T extends Array<infer U> ? (MutArray<U> & ProxyExtensions<T>) :
        T extends Map<infer K, infer V> ? (MutMap<K, V> & ProxyExtensions<T>) :
        T extends Set<infer K> ? (MutSet<K> & ProxyExtensions<T>) :
        T extends object ? (MutObject<T> & ProxyExtensions<T> & ObjectExtension<T>) :
        never);

export interface MutArray<T> extends ReadonlyArray<Mut<T>> { }
export interface MutMap<K, V> extends ReadonlyMap<K, Mut<V>> { }
export interface MutSet<K> extends ReadonlySet<K> { }

export type MutObject<T> = {
    readonly [P in NonFunctionPropertyNames<T>]: Mut<T[P]>;
};

export interface ProxyExtensions<T> {
    readonly [isProxySymbol]: true;
    readonly [proxyPathSymbol]: Path;
    mutate(action: Mutation<T>): void;
    replace(value: T): void;
    readonly: DeepReadonly<T>;
};

export type ObjectExtension<T> = {
    update(value: Partial<T>): void;
}

export type Path = PropertyKey[];
export type Mutation<T> = (a: T) => void;
export type Action<T = any> =
    { kind: "mutate", mutation: Mutation<T> } |
    { kind: "replacement", with: T } |
    { kind: "update", with: Partial<T> };
export type Mutations = [Path, Action][];

const mutate = (path: Path, onMutate: OnMutate) => (f: Mutation<any>) => {
    onMutate(path, { kind: "mutate", mutation: f });
};
const replace = (path: Path, onMutate: OnMutate) => (v: any) => {
    onMutate(path, { kind: "replacement", with: v });
};
const update = (path: Path, onMutate: OnMutate) => (v: any) => {
    onMutate(path, { kind: "update", with: v });
};

function basic_handler(path: Path, onMutate: OnMutate): ProxyHandler<any> {
    return {
        get(obj, prop) {
            if (prop === isProxySymbol) { return true; }
            if (prop === proxyPathSymbol) { return path; }
            if (prop === 'mutate') {
                return mutate(path, onMutate);
            }
            if (prop === 'replace') {
                return replace(path, onMutate);
            }
            if (prop === 'update') {
                return update(path, onMutate);
            }
            if (prop === 'readonly') {
                return obj;
            }
            return proxify(obj[prop], [...path, prop], onMutate);
        },
    };

}

function proxyify_object<T extends object>(object: T, path: Path, onMutate: OnMutate): T {
    if (object === null) { return null as any; }
    return new Proxy(object, basic_handler(path, onMutate));
}

export function proxify<T>(value: T, path: Path, onMutate: OnMutate): Mut<T> {
    switch (typeof value) {
        case 'object': return proxyify_object<any>(value, path, onMutate);
        case 'function': return value as any;
        default: return value as any;
    }
}

// TODO: sort by depth and apply deep-up?
export function apply_mutations(obj: any, mutations: Array<[Path, Action]>) {
    function apply_single(obj: any, path: Path, action: Action) {
        if (path.length === 0) {
            switch (action.kind) {
                case "mutate":
                    action.mutation(obj);
                    break;
                case "replacement":
                    if (Array.isArray(obj)) {
                        obj.length = 0;
                        obj.push(...action.with);
                    } else {
                        for (const k in obj) {
                            if (obj.hasOwnProperty(k)) {
                                delete obj[k];
                            }
                        }
                        for (const k in action.with) {
                            obj[k] = action.with[k];
                        }
                    }
                    break;
                case "update":
                    for (const k in action.with) {
                        obj[k] = action.with[k];
                    }
                    break;
            }
        } else {
            const next = path.shift()!;
            if (obj[next]) {
                apply_single(obj[next], path, action)
            } else {
                throw new Error(`failed to find key ${next.toString()}`);
            }
        }
    }

    for (const [path, mutation] of mutations) {
        apply_single(obj, path, mutation);
    }
}
