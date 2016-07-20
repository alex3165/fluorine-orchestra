import invariant from 'invariant'
import { Store } from './Store'
import createReducerForStore from './util/createReducerForStore'
import combineStores from './util/combineStores'

import { Observable } from '@reactivex/rxjs'
import isDispatcher from 'fluorine-lib/lib/util/isDispatcher'

import {
  Iterable
} from 'immutable'

const resultCache = Symbol('resultCache')

export class Orchestra {
  static isOrchestra(obj) {
    return typeof obj === 'object' && obj instanceof Orchestra
  }

  constructor(...stores) {
    invariant(
      stores.length > 0 && stores.every(Store.isStore),
      'Orchestra: constructor expects to receive Stores.')

    const _stores = stores
      .reduce((acc, store) => {
        const { identifier } = store

        if (acc[identifier]) {
          throw new Error(`Orchestra: The identifier \`${identifier}\` is not unique.`)
        }

        acc[identifier] = store
        return acc
      }, {})

    this[resultCache] = {}
    this.stores = _stores
    this.externals = {}
  }

  addReducer(identifier, reducer) {
    invariant(
      typeof identifier === 'string',
      'Orchestra: `identifier` is expected to be a string.')
    invariant(
      typeof reducer === 'function',
      'Orchestra: `reducer` is expected to be a reducer function.')

    const { externals, stores } = this

    invariant(stores[identifier], `Orchesta: The identifier \`${identifier}\` is already taken by a Store.`)
    invariant(externals[identifier], `Orchesta: The identifier \`${identifier}\` is not unique.`)

    externals[identifier] = reducer
    return this
  }

  reduce(dispatcher) {
    invariant(isDispatcher(dispatcher), 'Orchestra: `dispatcher` is expected to be a Fluorine dispatcher.')
    if (this[resultCache][dispatcher.identifier]) {
      return this[resultCache][dispatcher.identifier]
    }

    const { stores, externals } = this

    const _externals = Object
      .keys(externals)
      .reduce((acc, key) => {
        const external = externals[key]
        acc[key] = dispatcher.reduce(external)
        return acc
      }, {})

    const _stores = {}

    const resolveStore = (store, visited = {}) => {
      const { identifier } = store

      if (visited[identifier]) {
        throw new Error(`Orchestra: Failed to resolve circular dependency for identifier \`${identifier}\`.`)
      }

      visited[identifier] = true

      if (_stores[identifier]) {
        return _stores[identifier]
      }

      const reducer = createReducerForStore(store)
      const dependencies = store.getDependencyIdentifiers()
      const post = store.getPost()

      const _dependencies = {}
      for (const dependency of dependencies) {
        let _dependency

        if (_externals[dependency]) {
          _dependency = _externals[dependency]
        } else if (_stores[dependency]) {
          _dependency = _stores[dependency]
        } else if (stores[dependency]) {
          _dependency = resolveStore(stores[dependency], visited)
        } else {
          throw new Error(`Orchestra: Failed to resolve dependency for identifier \`${dependency}\`.`)
        }

        _dependencies[dependency] = _dependency
      }

      const _store = dispatcher.reduce(reducer)
      const res = combineStores({ ..._dependencies, [identifier]: _store })
        .map(deps => {
          let state = deps[identifier]

          // Resolve all dependencies
          for (const dependency of dependencies) {
            const dependencyState = deps[dependency]
            const getter = store.useDependencyGetter.bind(null, dependency)
            const setter = store.useDependencySetter.bind(null, dependency)
            let missingIds = new Set()

            state = state.map(x => {
              const ids = getter(x)

              let result
              if (!Iterable.isIterable(ids)) {
                result = dependencyState.get(ids)
                if (!result) {
                  missingIds = missingIds.add(ids)
                  return x
                }
              } else {
                result = dependencyState.filter((_, key) => ids.includes(key))
                if (!result.size) {
                  missingIds = result.toKeySeq().toSet()
                  return x
                }
              }

              return setter(x, result)
            })

            if (missingIds.size) {
              const dependencyStore = stores[dependency]
              dependency._missing(missingIds)
            }
          }

          return state.map(post)
        })
        .distinctUntilChanged()
        .share()

      _stores[identifier] = res
      return res
    }

    for (const store of stores) {
      const { identifier } = store
      _stores[identifier] = resolveStore(store)
    }

    this[resultCache][dispatcher.identifier] = _stores
    return _stores
  }
}

export default function createOrchestra(...stores) {
  return new Orchestra(...stores)
}
