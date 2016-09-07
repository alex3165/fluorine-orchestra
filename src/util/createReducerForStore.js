import invariant from 'invariant'
import { Store } from '../Store'
import toMap from './toMap'

import {
  Iterable,
  Map,
  Set
} from 'immutable'

import {
  STORE_INSERT,
  STORE_REMOVE,
  STORE_FILTER,
  STORE_UPDATE
} from '../constants/StoreConstants'

export default function createReducerForStore(store) {
  invariant(store && Store.isStore(store), 'Reducer: `store` is expected to be an Orchestra.Store.')

  const identifier = store.getIdentifier()
  const pre = store.getPre()
  const initial = store.createCollection()

  return function storeReducer(state = initial, action) {
    if (identifier !== action.identifier) {
      return state
    }

    const { type, payload, groupId, selector } = action
    switch (type) {
      case STORE_INSERT: {
        if (Map.isMap(payload)) {
          const item = pre(payload)
          if (!item) {
            return state
          }

          const id = item.get('id')
          const res = state.set(id, item)

          return groupId ? res.addIdToGroup(groupId, id) : res
        }

        // Deduping the incoming data by ids, since Immutable has a bug where keys
        // have to be unique while using mutable data.
        const track = {}

        const res = state.asMutable()

        payload.forEach(value => {
          const item = pre(value)
          if (!item) {
            return state
          }

          const id = item.get('id')
          if (!track[id]) {
            track[id] = true
            res.set(id, item)
          }
        })

        return groupId ? res.addIdsToGroup(groupId, new Set(Object.keys(track))) : res
      }

      case STORE_REMOVE: {
        if (!payload) {
          return state
        } else if (Map.isMap(payload)) {
          const id = payload.get('id')
          return state.delete(id)
        }

        return state.delete(payload)
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
