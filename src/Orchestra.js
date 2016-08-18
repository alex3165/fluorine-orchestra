import invariant from 'invariant'
import { Observable } from '@reactivex/rxjs'

import { Collection } from './Collection'
import { Store } from './Store'
import combineStores from './util/combineStores'

import isDispatcher from 'fluorine-lib/lib/util/isDispatcher'

import {
  Iterable,
  Set
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

    invariant(!stores.hasOwnProperty(identifier), `Orchesta: The identifier \`${identifier}\` is already taken by a Store.`)
    invariant(!externals.hasOwnProperty(identifier), `Orchesta: The identifier \`${identifier}\` is not unique.`)

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

      const reducer = store.getReducer()
      const dependencies = store.getDependencies()
      const post = store.getPost()

      const _dependencies = Object
        .keys(dependencies)
        .reduce((acc, dependency) => {
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

          acc[dependency] = _dependency
          return acc
        }, {})

      const _store = dispatcher.reduce(reducer)
      const res = combineStores({ ..._dependencies, [identifier]: _store })
        .map(deps => {
          // Resolve all dependencies
          const state = Object
            .keys(dependencies)
            .reduce((acc, dependencyIdentifier) => {
              const dependencyState = deps[dependencyIdentifier]
              const { getter, setter } = dependencies[dependencyIdentifier]

              // If getter exists we need to resolve dependencies per ids
              if (getter && typeof getter === 'function') {
                let missingIds = []

                const nextState = acc.map(x => {
                  const ids = getter(x)
                  let result = undefined

                  if (typeof ids === 'string') {
                    result = dependencyState.get(ids)

                    if (!result) {
                      missingIds = missingIds.concat(ids)
                      return x
                    }
                  } else if (Iterable.isIterable(ids) || Array.isArray(ids)) {
                    invariant(typeof ids.forEach === 'function', 'Orchestra: `ids` is expected to have a method `forEach`.')

                    const store = stores[dependencyIdentifier]
                    const collection = store ? store.createCollection() : Collection

                    result = collection.withMutations(map => {
                      ids.forEach(id => {
                        const item = dependencyState.get(id)
                        if (item === undefined) {
                          missingIds = missingIds.concat(id)
                        }

                        map.set(id, item)
                      })
                    })
                  }

                  return setter(x, result)
                })

                // Report missing items for ids
                const dependencyStore = stores[dependencyIdentifier]
                if (dependencyStore) {
                  dependencyStore._missing(new Set(missingIds), identifier)
                }

                return nextState
              }

              // If there is no getter we just map over the items with the setter only
              return acc.map(x => setter(x, dependencyState))
            }, deps[identifier])

          return state.map(post)
        })
        .distinctUntilChanged()
        .publishReplay(1)
        .refCount()

      _stores[identifier] = res

      return res
    }

    for (const identifier in stores) {
      if (stores.hasOwnProperty(identifier)) {
        const store = stores[identifier]
        _stores[identifier] = resolveStore(store)
      }
    }

    this[resultCache][dispatcher.identifier] = _stores
    return _stores
  }
}

export default function createOrchestra(...stores) {
  return new Orchestra(...stores)
}
