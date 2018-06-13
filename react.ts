import * as React from "react";
import { Store } from "./store";
import { Mut } from "./proxy_war";

export class MutStateComponent<P, S> extends React.Component<P> {
    private readonly stateStore: Store<S>;
    private readonly unsubscribe: () => void;

    constructor(props: P, state: S, context?: any) {
        super(props, context);
        this.stateStore = new Store(state);
        this.unsubscribe = this.stateStore.listen(() => this.forceUpdate());
    }

    componentWillUnmount() {
        this.unsubscribe();
    }

    public get mutState(): Mut<S> {
        return this.stateStore.getRoot();
    }

    get state() { return {} };
    set state(_: {}) { };

    setState() {
        throw new Error("setState on a MutStateComponent is illegal.  ");
    }
}
