import invariant from 'invariant'
import { Store } from '../Store'
import toMap from './toMap'

import {
  Iterable,
  OrderedMap,
  Map
} from 'immutable'

import {
  STORE_INSERT,
  STORE_REMOVE,
  STORE_FILTER,
  STORE_UPDATE
} from '../constants/StoreConstants'

export default function createReducerForStore(store) {
  invariant(store && Store.isStore(store), 'Reducer: `store` is expected to be an Orchestra.Store.')

  const { identifier, dependencies } = store
  const pre = store.getPre()
  const depKeys = Object.keys(dependencies)
  const Collection = store.getCollection()
  const initial = new Collection(new OrderedMap(), depKeys)

  return function storeReducer(state = initial, action) {
    if (identifier !== action.identifier) {
      return state
    }

    const { type, payload, selector } = action
    switch (type) {
      case STORE_INSERT: {
        if (Iterable.isKeyed(payload)) {
          const item = pre(payload)
          if (!item) {
            return state
          }

          const id = item.get('id')
          return state.set(id, item)
        }

        return state.withMutations(map => {
          payload.forEach(value => {
            const item = pre(value)
            if (!item) {
              return state
            }

            const id = item.get('id')
            map.set(id, item)
          })
        })
      }

      case STORE_REMOVE: {
        if (!payload) {
          return state
        }

        if (typeof payload === 'string') {
          return state.delete(payload)
        }

        const id = payload.get('id')
        return state.delete(id)
      }

      case STORE_FILTER: {
        if (typeof selector !== 'function') {
          return state
        }

        return state.filter(selector)
      }

      case STORE_UPDATE: {
        if (typeof selector !== 'function') {
          return state
        }

        return state.map(x => {
          const item = pre(selector(x))
          return item ? item : x
        })
      }

      default: return state
    }
  }
}
