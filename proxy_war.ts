export type OnMutate = (path: Path, apply: Action) => void;

export type NonFunctionPropertyNames<T> = {
    [P in keyof T]: T[P] extends Function ? never : P;
}[keyof T];

export const isProxySymbol = Symbol();
export const proxyPathSymbol = Symbol();

export type Mut<T> =
    T extends number ? number :
    T extends string ? string :
    T extends boolean ? boolean :
    T extends null ? null :
    T extends Array<infer U> ? (MutArray<U> & ProxyExtensions<T>) :
    T extends object ? (MutObject<T> & ProxyExtensions<T>) :
    never;

export interface MutArray<T> extends ReadonlyArray<Mut<T>> { }

export type MutObject<T> = {
    readonly [P in NonFunctionPropertyNames<T>]: Mut<T[P]>;
};

export type ProxyExtensions<T> = {
    [isProxySymbol]: true,
    [proxyPathSymbol]: Path,
    "mutate": (action: Mutation<T>) => void,
    "replace": (value: T) => void,
};

export type Path = PropertyKey[];
export type Mutation<T> = (a: T) => void;
export type Action<T = any> =
    { kind: "mutate", mutation: Mutation<T> } |
    { kind: "replacement", with: T };
export type Mutations = [Path, Action][];

function basic_handler(path: Path, onMutate: OnMutate): ProxyHandler<any> {
    return {
        get(obj, prop) {
            if (prop === isProxySymbol) { return true; }
            if (prop === proxyPathSymbol) { return path; }
            if (prop === 'mutate') {
                return function (f: Mutation<any>) {
                    onMutate(path, { kind: "mutate", mutation: f });
                }
            }
            if (prop === 'replace') {
                return function (v: any) {
                    onMutate(path, { kind: "replacement", with: v });
                }
            }
            return proxify(obj[prop], [...path, prop], onMutate);
        },
    };

}

function proxyify_object<T extends object>(object: T, path: Path, onMutate: OnMutate): T {
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
        if (path.length === 0 && action.kind === "mutate") {
            action.mutation(obj);
            return;
        } else if (path.length === 0 && action.kind === "replacement") {
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
            return;
        }

        const next = path.shift()!;
        if (obj[next]) {
            apply_single(obj[next], path, action)
        } else {
            throw new Error(`failed to find key ${next.toString()}`);
        }
    }

    for (const [path, mutation] of mutations) {
        apply_single(obj, path, mutation);
    }
}
