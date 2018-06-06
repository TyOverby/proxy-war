import { proxify, Action, Mut, Path, apply_mutations, } from "./proxy_war";
export { Mut } from "./proxy_war";

export type CancelListen = () => void;
export type ListenFunc<T> = (state: Mut<T>) => void;

type Debouncer = (c: () => void) => number;

export class Store<T> {
    private state: T;
    private listeners: ListenFunc<T>[];

    private changesSinceLast: [Path, Action][] = [];
    private debouncer: Debouncer;
    private lastUpdateId: number = 0;

    constructor(defaultState: T) {
        this.state = defaultState;
        this.listeners = [];

        if (typeof (requestAnimationFrame) !== 'undefined') {
            this.debouncer = requestAnimationFrame;
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
        this.lastUpdateId = this.debouncer(() => {
            if (this.lastUpdateId === 0) {
                this.triggerChange();
            }
        });
    }

    public flush() {
        this.lastUpdateId = 0;
        this.triggerChange();
    }

    public getRoot(): Mut<T> {
        return proxify(
            this.state,
            [],
            (path, action) => this.appendChange(path, action));
    }
}
