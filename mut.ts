import { proxyify_any, Mut, Action, Path, apply_mutations, } from "./proxy_war";


type CancelListen = () => void;
type ListenFunc<T> = (state: Mut<T>) => void;

type Debouncer = (c: () => void) => number;

export interface Store<T> {
    listen(f: ListenFunc<T>): CancelListen;
    getRoot(): Mut<T>;
}

class StoreImpl<T> implements Store<T> {
    private state: T;
    private listeners: ListenFunc<T>[];

    private changesSinceLast: [Path, Action][] = [];
    private debouncer: Debouncer;
    private lastUpdateId: number = 0;

    constructor(defaultState: T) {
        this.state = defaultState;
        this.listeners = [];
        this.debouncer = requestAnimationFrame || (c => setTimeout(c, 0));
    }

    public listen(f: ListenFunc<T>): CancelListen {
        this.listeners.push(f);
        return () => {
            var index = this.listeners.indexOf(f);
            if (index >= 0) {
                this.listeners.splice(index, 1);
            }
        };
    }

    private triggerChange(path: Path, action: Action) {
        this.changesSinceLast.push([path, action]);
        if (this.lastUpdateId === 0) {
            this.lastUpdateId = this.debouncer(() => {
                const actions = this.changesSinceLast;
                this.changesSinceLast = [];
                this.lastUpdateId = 0;

                apply_mutations(this.state, actions);
                const root = this.getRoot();
                for (const listener of this.listeners) {
                    listener.apply(root);
                }
            });
        }
    }

    public getRoot(): Mut<T> {
        return proxyify_any(
            this.state,
            [],
            (path, action) => this.triggerChange(path, action));
    }
}

export function store<T>(defaultState: T): Store<T> {
    return new StoreImpl(defaultState);
}
