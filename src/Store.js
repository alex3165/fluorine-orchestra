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

const missingSubject = Symbol('missingSubject')

export class Store {
  static isStore(obj) {
    return typeof obj === 'object' && obj instanceof Store
  }

  constructor(identifier, opts = {}) {
    invariant(typeof identifier === 'string', 'Store: `identifier` is expected to be a string.')

    this[missingSubject] = new Subject()
    this.identifier = identifier
    this.opts = opts
    this.dependencies = []
  }

  pre(transformer) {
    invariant(typeof transformer === 'function', 'Store: `transformer` is expected to be a function.')

    this.pre = transformer
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

    this.post = transformer
    return this
  }

  observeMissing() {
    return this[missingSubject].asObservable()
  }

  getPre() {
    return this.pre || (x => x)
  }

  getDependencyIdentifiers() {
    return this.dependencies
      .map(x => x.identifier)
  }

  getPost() {
    return this.post || (x => x)
  }

  useDependencyGetter(identifier, x) {
    const { getter } = this.dependencies[identifier]
    const res = getter(x)

    invariant(
      typeof x === 'string' || Iterable.isIterable(x),
      `Store: The result of ${identifier}'s getter is expected to be an id (string) or an iterable of ids.`)

    return res
  }

  useDependencySetter(identifier, x, y) {
    const { setter } = this.dependencies[identifier]
    const res = toMap(setter(x, y))

    return res
  }

  _missing(ids) {
    invariant(Set.isSet(ids), 'Store: `ids` is expected to be an Immutable.Set.')
    this[missingSubject].next(ids)
  }

  _action(primitive) {
    const { identifier } = this.opts
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
