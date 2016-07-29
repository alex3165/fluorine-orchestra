import invariant from 'invariant'
import { OrderedMap, Iterable } from 'immutable'
import createInheritable from './util/createInheritable'

let EMPTY_COLLECTION
export function Collection(obj = new OrderedMap(), dependencies = []) {
  invariant(dependencies.every(x => typeof x === 'string'),
    'Collection: `dependencies` is expected to contain only identifiers (strings).')

  this.data = OrderedMap.isOrderedMap(obj) ? obj : new OrderedMap(obj)
  this.size = this.data.size
  this.dependencies = dependencies

  if (this.size === 0) {
    return EMPTY_COLLECTION || (EMPTY_COLLECTION = this)
  }

  invariant(this.data.every(x => Iterable.isKeyed(x)),
    'Collection: Expected to only contain keyed iterables.')

  return this
}

function wrapOrderedMap(key) {
  return function wrapper(...args) {
    const data = this.data[key](...args)
    if (data === this.data) {
      return this
    }

    const collection = new Collection(data)
    collection.dependencies = this.dependencies

    return collection
  }
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

// Returns Collection with only incomplete items
Collection.prototype.filterComplete = function filterComplete() {
  const { data, dependencies } = this

  const _data = this.data.filter(x => x
    .reduce((acc, key) => acc && (
      x.has(acc) && x.get(acc) === undefined
    ), true))

  if (_data.size === data.size) {
    return this
  } else if (_data.size === 0) {
    return EMPTY_COLLECTION
  }

  return new Collection(_data)
}

// Returns Collection with only complete items
Collection.prototype.filterIncomplete = function filterIncomplete() {
  const { data, dependencies } = this

  const _data = this.data.filter(x => x
    .reduce((acc, key) => acc && !(
      x.has(acc) && x.get(acc) === undefined
    ), true))

  if (_data.size === data.size) {
    return this
  } else if (_data.size === 0) {
    return EMPTY_COLLECTION
  }

  return new Collection(_data)
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
  'hashCode',
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
  Collection.prototype[key] = wrapOrderedMap(key)
}

const disabledMethods = [
  'asMutable',
  'asImmutable',
  'toArray',
  'equals'
]

for (const key of disabledMethods) {
  Collection.prototype[key] = function disabled() {
    throw new Error(`Collection: \`${key}\` is not being wrapped or inherited by Collection.`)
  }
}

export default function createCollection(obj, dependencies) {
  return new Collection(obj, dependencies)
}

