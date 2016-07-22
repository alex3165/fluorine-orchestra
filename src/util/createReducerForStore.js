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

  const { identifier } = store
  const pre = store.getPre()

  return function storeReducer(state = new OrderedMap(), action) {
    if (identifier !== action.identifier) {
      return state
    }

    const { type, payload, selector } = action
    switch (type) {
      case STORE_INSERT: {
        if (Iterable.isKeyed(payload)) {
          const item = toMap(pre(payload))
          const id = item.get('id')
          return state.set(id, item)
        }

        return state.withMutations(map => {
          payload.forEach(value => {
            const item = toMap(pre(value))
            const id = item.get('id')
            map.set(id, item)
          })
        })
      }

      case STORE_REMOVE: {
        if (typeof payload === 'string') {
          return state.delete(payload)
        }

        const id = payload.get('id')
        return state.delete(id)
      }

      case STORE_FILTER: {
        return state.filter(selector)
      }

      case STORE_UPDATE: {
        return state.map(x => pre(selector(x)))
      }

      default: return state
    }
  }
}
