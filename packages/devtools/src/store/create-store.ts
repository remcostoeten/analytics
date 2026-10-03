import { useSyncExternalStore } from "react";

export type Reducer<State, Action> = (state: State, action: Action) => State;

export type Store<State, Action> = {
  get: () => State;
  subscribe: (listener: () => void) => () => void;
  dispatch: (action: Action) => void;
};

/**
 * @name createStore
 * @description A minimal external store: state changes only through `reducer`, and listeners
 * run when the reducer returns a new state object. Each buffer of the widget owns one.
 *
 * @example
 * const store = createStore(listReducer, emptyList());
 * store.dispatch({ type: "prepend", rows });
 */
export function createStore<State, Action>(
  reducer: Reducer<State, Action>,
  initial: State,
): Store<State, Action> {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispatch: (action) => {
      const next = reducer(state, action);
      if (next === state) return;
      state = next;
      for (const listener of listeners) listener();
    },
  };
}

/**
 * @name useStore
 * @description Subscribes a component to a store with `useSyncExternalStore`.
 *
 * @example
 * const logs = useStore(runtime.logs);
 */
export function useStore<State, Action>(store: Store<State, Action>): State {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
