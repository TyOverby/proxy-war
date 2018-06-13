import { proxify, Action, Mut, Path, apply_mutations, } from "./proxy_war";

export type CancelListen = () => void;
export type ListenFunc<T> = (state: Mut<T>) => void;

/// A function that schedules a function to be executed in the future.
/// It must return a non-zero number.  Examples of good debouncer functions
/// are window.requestAnimationFrame and window.setTimeout.
type Debouncer = (c: () => void) => number;

export class Store<T> {
    private state: T;
    private listeners: ListenFunc<T>[];

    private changesSinceLast: [Path, Action][] = [];
    private debouncer: Debouncer;
    private lastUpdateId: number = 0;

    constructor(defaultState: T, debouncer: Debouncer | null = null) {
        this.state = defaultState;
        this.listeners = [];

        if (debouncer) {
            this.debouncer = debouncer;
        } else if (typeof (requestAnimationFrame) !== 'undefined') {
            this.debouncer = (f) => window.requestAnimationFrame(f);
        } else {
            this.debouncer = (c => setTimeout(c, 0));
        }
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

    private triggerChange() {
        const actions = this.changesSinceLast;
        this.changesSinceLast = [];
        this.lastUpdateId = 0;

        apply_mutations(this.state, actions);
        const root = this.getRoot();
        for (const listener of this.listeners) {
            listener.apply(root);
        }
    }

    private appendChange(path: Path, action: Action) {
        this.changesSinceLast.push([path, action]);
        if (this.lastUpdateId === 0) {
            this.lastUpdateId = this.debouncer(() => {
                this.triggerChange();
            });
        }
    }

    public flush() {
        this.triggerChange();
    }

    public getRoot(): Mut<T> {
        return proxify(
            this.state,
            [],
            (path, action) => this.appendChange(path, action));
    }
}
