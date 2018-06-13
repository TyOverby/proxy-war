export type DeepReadonly<T> =
    T extends number ? number :
    T extends string ? string :
    T extends boolean ? boolean :
    T extends null ? null :
    T extends Array<infer U> ? ReadonlyArray<U> :
    T extends Map<infer K, infer V> ? DeepReadonlyMap<K, V> :
    T extends Set<infer K> ? DeepReadonlySet<K> :
    T extends object ? DeepReadonlyObject<T> :
    never;

export interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> { }
export interface DeepReadonlyMap<K, V> extends ReadonlyMap<K, DeepReadonly<V>> { }
export interface DeepReadonlySet<K> extends ReadonlySet<DeepReadonly<K>> { }

export type NonFunctionPropertyNames<T> = {
    [P in keyof T]: T[P] extends Function ? never : P;
}[keyof T];
export type DeepReadonlyObject<T> = {
    readonly [P in NonFunctionPropertyNames<T>]: DeepReadonly<T[P]>;
};
