import invariant from 'invariant'
import { Subject } from '@reactivex/rxjs'
import toMap from './util/toMap'

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
    this.dependencies = []
    this.hooks = {}
  }

  pre(transformer) {
    invariant(typeof transformer === 'function', 'Store: `transformer` is expected to be a function.')

    this.hooks.pre = transformer
    return this
  }

  dependsOn(identifier, getter, setter) {
    invariant(typeof identifier === 'string', 'Store: `identifier` is expected to be a string.')
    invariant(typeof getter === 'function', 'Store: `getter` is expected to be a function.')
    invariant(typeof setter === 'function', 'Store: `setter` is expected to be a function.')

    this.dependencies.push({
      identifier,
      getter,
      setter
    })
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

  getPre() {
    return this.hooks.pre || (x => x)
  }

  getDependencyIdentifiers() {
    return this.dependencies
      .map(x => x.identifier)
  }

  getPost() {
    return this.hooks.post || (x => x)
  }

  useDependencyGetter(identifier, x) {
    const { dependencies } = this
    const { getter } = dependencies.find(dep => dep.identifier === identifier)
    const res = getter(x)

    invariant(
      (Iterable.isIterable(res) && res.every(id => typeof id === 'string')) ||
      typeof res === 'string',
      `Store: The result of ${identifier}'s getter is expected to be an id (string) or an iterable of ids.`)

    return res
  }

  useDependencySetter(identifier, x, y) {
    const { dependencies } = this
    const { setter } = dependencies.find(dep => dep.identifier === identifier)
    const res = toMap(setter(x, y))

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
        const ids = cache[key]
        return ids ? acc.union(ids) : acc
      }, new Set())

    subject.next(missingIds)
  }

  _action(primitive) {
    const { identifier } = this
    primitive.identifier = identifier
    return primitive
  }

  insert(payload) {
    invariant(payload && (
      Iterable.isKeyed(payload) ||
      (Iterable.isIterable(payload) && payload.every && payload.every(Iterable.isKeyed))
    ), 'Store: `payload` is expected to be a keyed iterable or an iterable containing keyed iterables.')

    return this._action({ type: STORE_INSERT, payload })
  }

  remove(payload) {
    invariant(payload && (
      typeof payload === 'string' ||
      (Iterable.isKeyed(payload) && typeof payload.get('id') === 'string')
    ), 'Store: `payload` is expected to be an id or a keyed iterable containing an id.')

    return this._action({ type: STORE_REMOVE, payload })
  }

  filter(selector) {
    invariant(typeof selector === 'function', 'Store: `selector` is expected to be a function.')

    return this._action({ type: STORE_FILTER, selector })
  }

  update(selector) {
    invariant(typeof selector === 'function', 'Store: `selector` is expected to be a function.')

    return this._action({ type: STORE_UPDATE, selector })
  }
}

export default function createStore(identifier, opts) {
  return new Store(identifier, opts)
}
