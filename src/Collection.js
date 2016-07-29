import invariant from 'invariant'
import { OrderedMap } from 'immutable'
import createInheritable from './util/createInheritable'

let EMPTY_COLLECTION
export function Collection(obj) {
  this.data = OrderedMap.isOrderedMap(obj) ? obj : new OrderedMap(obj)
  this.size = this.data.size

  if (this.size === 0) {
    return EMPTY_COLLECTION || (EMPTY_COLLECTION = this)
  }

  return this
}

Collection.prototype = createInheritable(OrderedMap)
Collection.prototype.constructor = Collection

Collection.of = function of(obj) {
  return new Collection(obj)
}

Collection.isCollection = function isCollection(obj) {
  return obj && obj instanceof Collection
}

Collection.prototype.toOrderedMap = function toString() {
  return this.data
}

Collection.prototype.toString = function toString() {
  this.data.__toString('Collection {', '}')
}

Collection.prototype.toString = function toString() {
  this.data.__toString('Collection {', '}')
}

Collection.prototype.__ensureOwner = function __ensureOwner(ownerId) {
  const res = this.data.__ensureOwner(ownerId)
  if (res === this.data) {
    return this
  }

  return new Collection(res)
}

const proxyMethods = [
  'wasAltered',
  'get',
  'has',
  'includes',
  'first',
  'last',
  'getIn',
  'hasIn',
  'keys',
  'values',
  'entries',
  'keySeq',
  'valueSeq',
  'entrySeq',
  'groupBy',
  'forEach',
  'reduce',
  'reduceRight',
  'every',
  'some',
  'join',
  'isEmpty',
  'count',
  'countBy',
  'find',
  'findLast',
  'findEntry',
  'findLastEntry',
  'findKey',
  'findLastKey',
  'keyOf',
  'lastKeyOf',
  'max',
  'maxBy',
  'min',
  'minBy',
  'flip',
  'toJS',
  'toObject'
]

for (const key of proxyMethods) {
  Collection.prototype[key] = function proxy(...args) {
    return this.data[key](...args)
  }
}

const wrapMethods = [
  'set',
  'delete',
  'clear',
  'update',
  'merge',
  'mergeWith',
  'mergeDeep',
  'mergeDeepWith',
  'setIn',
  'deleteIn',
  'updateIn',
  'mergeIn',
  'mergeDeepIn',
  'slice',
  'rest',
  'butLast',
  'skip',
  'skipLast',
  'skipWhile',
  'skipUntil',
  'take',
  'takeLast',
  'takeWhile',
  'takeUntil',
  'map',
  'filter',
  'filterNot',
  'reverse',
  'sort',
  'sortBy',
  'concat',
  'mapKeys',
  'mapEntries',
  'withMutations'
]

for (const key of wrapMethods) {
  Collection.prototype[key] = function wrapper(...args) {
    return new Collection(this.data[key](...args))
  }
}

const disabledMethods = [
]

export default function createCollection(obj) {
  return new Collection(obj)
}

