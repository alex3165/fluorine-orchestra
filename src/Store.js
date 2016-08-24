import invariant from 'invariant'
import { Subject } from '@reactivex/rxjs'
import toMap from './util/toMap'
import createReducerForStore from './util/createReducerForStore'
import { Collection } from './Collection'

import {
  Iterable,
  OrderedMap,
  Set
} from 'immutable'

import {
  STORE_INSERT,
  STORE_REMOVE,
  STORE_FILTER,
  STORE_UPDATE
} from './constants/StoreConstants'

const missing = Symbol('missingSubject')

export class Store {
  static isStore(obj) {
    return typeof obj === 'object' && obj instanceof Store
  }

  constructor(identifier, opts = {}) {
    invariant(typeof identifier === 'string', 'Store: `identifier` is expected to be a string.')

    this[missing] = {
      subject: new Subject(),
      cache: {}
    }

    this.identifier = identifier
    this.opts = opts
    this.dependencies = {}
    this.hooks = {}

    this.insert = this.insert.bind(this)
    this.remove = this.remove.bind(this)
    this.filter = this.filter.bind(this)
    this.update = this.update.bind(this)
  }

  pre(transformer) {
    invariant(typeof transformer === 'function', 'Store: `transformer` is expected to be a function.')

    this.hooks.pre = transformer
    return this
  }

  dependsOn(identifier, getter, setter) {
    const { dependencies } = this

    invariant(typeof identifier === 'string', 'Store: `identifier` is expected to be a string.')
    invariant(typeof getter === 'function', 'Store: `getter` is expected to be a function.')
    invariant(setter === undefined || typeof setter === 'function', 'Store: `setter` is expected to be a function.')
    invariant(!dependencies[identifier], `Store: There is already an existing dependency to the store \`${identifier}\`.`)

    dependencies[identifier] = { identifier, getter, setter }

    return this
  }

  post(transformer) {
    invariant(typeof transformer === 'function', 'Store: `transformer` is expected to be a function.')

    this.hooks.post = transformer
    return this
  }

  observeMissing() {
    return this[missing].subject.asObservable()
  }

  useCollection(col) {
    invariant(col && col.prototype instanceof Collection,
      'Store: `col` is expected to be a Collection.')

    this.collection = col
    return this
  }

  getIdentifier() {
    return this.identifier
  }

  getPre() {
    return this.hooks.pre || (x => toMap(x))
  }

  getDependencies() {
    return this.dependencies
  }

  getPost() {
    return this.hooks.post || (x => x)
  }

  getReducer() {
    if (this.reducer && typeof this.reducer === 'function') {
      return this.reducer
    }

    this.reducer = createReducerForStore(this)
    return this.reducer
  }

  createCollection() {
    const CollectionClass = this.collection || Collection

    const res = new CollectionClass()
    res.dependencies = Object.keys(this.dependencies)

    return res
  }

  _missing(ids, identifier = null) {
    const { cache, subject } = this[missing]

    invariant(
      Set.isSet(ids) && ids.every(x => typeof x === 'string'),
      'Store: `ids` is expected to be an Immutable.Set of ids (string).')

    cache[identifier] = ids

    const missingIds = Object
      .keys(cache)
      .reduce((acc, key) => {
        const _set = cache[key]
        return _set ? acc.union(_set) : acc
      }, new Set())

    subject.next(missingIds)
  }

  insert(payload) {
    invariant(payload && (
      Iterable.isKeyed(payload) ||
      (Iterable.isIterable(payload) && payload.every && payload.every(Iterable.isKeyed))
    ), 'Store: `payload` is expected to be a keyed iterable or an iterable containing keyed iterables.')
    const { identifier } = this

    return {
      type: STORE_INSERT,
      identifier,
      payload
    }
  }

  remove(payload) {
    invariant(payload && (
      typeof payload === 'string' ||
      (Iterable.isKeyed(payload) && typeof payload.get('id') === 'string')
    ), 'Store: `payload` is expected to be an id or a keyed iterable containing an id.')
    const { identifier } = this

    return {
      type: STORE_REMOVE,
      identifier,
      payload
    }
  }

  filter(selector) {
    invariant(typeof selector === 'function', 'Store: `selector` is expected to be a function.')
    const { identifier } = this

    return {
      type: STORE_FILTER,
      identifier,
      selector
    }
  }

  update(selector) {
    invariant(typeof selector === 'function', 'Store: `selector` is expected to be a function.')
    const { identifier } = this

    return {
      type: STORE_UPDATE,
      identifier,
      selector
    }
  }
}

export default function createStore(identifier, opts) {
  return new Store(identifier, opts)
}
