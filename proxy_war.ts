type OnMutate = (path: Path, apply: Action) => void;

export type Mut<T> = MutRec<T> & Mutable<T>;

type MutRec<T> = {
    [P in keyof T]: Mut<T[P]>;
}

type Mutable<T> = {
    mutate(f: (o: T) => void): void;
}

export const isProxySymbol = Symbol();
export const proxyPathSymbol = Symbol();

export type Path = PropertyKey[];
export type Action = (any) => void;

function basic_handler(path: Path, onMutate: OnMutate): ProxyHandler<any> {
    return {
        get(obj, prop) {
            if (prop === isProxySymbol) { return true; }
            if (prop === proxyPathSymbol) { return path; }
            if (prop === 'mutate') {
                return function (f: Action) {
                    onMutate(path, f);
                }
            }
            return proxyify_any(obj[prop], [...path, prop], onMutate);
        },
    };

}

function proxyify_object<T extends object>(object: T, path: Path, onMutate: OnMutate): T {
    return new Proxy(object, basic_handler(path, onMutate));
}

export function proxyify_any<T>(value: T, path: Path, onMutate: OnMutate): Mut<T> {
    switch (typeof value) {
        case 'object': return proxyify_object<any>(value, path, onMutate);
        //case 'function': throw new Error("unsupported type");
        default: return value as any;
    }
}

// TODO: sort by depth and apply deep-up?
export function apply_mutations(obj: any, mutations: Array<[Path, Action]>) {
    function apply_single(obj: any, path: Path, mutation: Action) {
        if (path.length === 0) {
            mutation(obj);
            return;
        }

        const next = path.shift();
        if (obj[next]) {
            apply_single(obj[next], path, mutation)
        } else {
            throw new Error(`failed to find key ${next}`);
        }
    }

    for (const [path, mutation] of mutations) {
        apply_single(obj, path, mutation);
    }
}
