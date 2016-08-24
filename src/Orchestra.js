import invariant from 'invariant'
import { Observable } from '@reactivex/rxjs'

import { Collection } from './Collection'
import { Store } from './Store'
import combineStores from './util/combineStores'
import createGetter from './util/createGetter'
import capitalizeString from './util/capitalizeString'

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

    // Assemble reduced externals
    const _externals = Object
      .keys(externals)
      .reduce((acc, key) => {
        const external = externals[key]

        acc[key] = dispatcher.reduce(external)

        return acc
      }, {})

    const _stores = Object
      .keys(stores)
      .reduce((acc, key) => {
        const store = stores[key]
        const reducer = store.getReducer()

        acc[key] = dispatcher.reduce(reducer)

        return acc
      }, {})

    // Empty collections for convenience
    const _emptyCollections = Object
      .keys(stores)
      .reduce((acc, key) => {
        const store = stores[key]
        const collection = store.createCollection()

        acc[key] = collection
        return acc
      }, {})

    for (const identifier in stores) {
      if (stores.hasOwnProperty(identifier)) {
        // Get the unresolved fluorine store
        const fluorineStore = _stores[identifier]

        // Get the post hook and all dependencies for this store
        const orchestraStore = stores[identifier]
        const post = orchestraStore.getPost()
        const dependencies = orchestraStore.getDependencies()
        const reducer = orchestraStore.getReducer()

        // If the store doesn't have any dependencies we only apply the post hook
        if (Object.keys(dependencies).length === 0) {
          // Override the old fluorine store
          _stores[identifier] = fluorineStore
            .map(state => state.map(post))
            .publishReplay(1)
            .refCount()

          continue // Honey, I'm home (early)
        }

        // Build object containing fluorine stores for all dependencies
        const _dependencyStores = Object
          .keys(dependencies)
          .reduce((acc, dependency) => {
            if (_externals[dependency]) {
              acc[dependency] = _externals[dependency]
            } else if (_stores[dependency]) {
              acc[dependency] = _stores[dependency]
            } else {
              throw new Error(`Orchestra: Failed to resolve dependency for identifier \`${dependency}\`.`)
            }

            return acc
          }, {})

        // Override the old fluorine store
        _stores[identifier] = combineStores({ ..._dependencyStores, [identifier]: fluorineStore })
          .map(deps => Object
            .keys(dependencies)
            .reduce((state, dependencyIdentifier) => {
              // Retrieve the dependency getter, setter and its state
              const dependencyState = deps[dependencyIdentifier]
              const { getter, setter } = dependencies[dependencyIdentifier]
              const emptyCollection = _emptyCollections[dependencyIdentifier]
              const dependencyName = capitalizeString(dependencyIdentifier)

              const missingIds = []

              // Modify every item
              const _state = state.map(x => {
                // Get dependency ids
                const ids = getter(x)

                invariant(typeof ids === 'string' || Iterable.isIterable(ids) || Array.isArray(ids),
                  'Orchestra: `ids` is expected to be a string, an iterable, or an Array.')

                // Collect missing ids from dependency item
                if (typeof ids === 'string') {
                  missingIds.push(ids)
                } else {
                  ids.forEach(id => {
                    if (!dependencyState.get(id)) {
                      missingIds.push(id)
                    }
                  })
                }

                const _get = createGetter(dependencyState, emptyCollection, ids)
                if (setter) {
                  return setter(x, _get)
                }

                x['get' + dependencyName] = _get
                return x
              })

              // Report missing ids
              const dependencyStore = stores[dependencyIdentifier]
              if (dependencyStore) {
                dependencyStore._missing(new Set(missingIds), identifier)
              }

              return _state
            }, deps[identifier])
            .map(post))
          .publishReplay(1)
          .refCount()
      }
    }

    this[resultCache][dispatcher.identifier] = _stores
    return _stores
  }
}

export default function createOrchestra(...stores) {
  return new Orchestra(...stores)
}
