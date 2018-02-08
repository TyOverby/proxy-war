type OnMutate = (path: Path, apply: Action) => void;

const proxy_symbol = Symbol();

type Path = PropertyKey[];
type Action = (any) => void;

function basic_handler(path: Path, onMutate: OnMutate): ProxyHandler<any> {
    const temp_storage = {};
    const proxy_cache = {};
    const deleted: { [x: string]: boolean } = {};
    return {
        set(obj, prop, value) {
            if (obj[prop] === value) return value;
            temp_storage[prop] = value;
            delete proxy_cache[prop];
            onMutate([...path, prop], obj => obj[prop] = value);
            return value;
        },
        get(obj, prop) {
            if (deleted[prop]) { return undefined; }
            if (prop === proxy_symbol) { return true; }
            if (proxy_cache[prop]) { return proxy_cache[prop] };
            if (temp_storage[prop]) {
                const proxied = proxyify_any(temp_storage[prop], [...path, prop], onMutate);
                proxy_cache[prop] = proxied;
                return proxied;
            }
            const proxied = proxyify_any(obj[prop], [...path, prop], onMutate);
            proxy_cache[prop] = proxied;
            return proxied;
        },
        deleteProperty(obj, prop) {
            delete temp_storage[prop];
            delete proxy_cache[prop];
            deleted[prop] = true;
            onMutate([...path, prop], obj => delete obj[prop]);
            return true;
        },
    };

}

function proxyify_object<T extends object>(object: T, path: Path, onMutate: OnMutate): T {
    return new Proxy(object, basic_handler(path, onMutate));
}

function proxyify_list<T>(list: T[], path: Path, onMutate: OnMutate): T[] {
    const base_handler = basic_handler(path, onMutate);
    const new_get: ProxyHandler<any[]> = {
        get(obj, prop) {
            if (obj[prop] === [].push) {

            }
        }
    };

    return new Proxy(list, base_handler);
}

function proxyify_any<T>(value: T, path: Path, onMutate: OnMutate): T {
    switch (typeof value) {
        case 'object': return proxyify_object<any>(value, path, onMutate);
        case 'function': throw new Error("oh no");
        default: return value;
    }
}
