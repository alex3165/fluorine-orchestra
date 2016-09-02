import invariant from 'invariant'
import { OrderedMap } from 'extendable-immutable'
import { Set, OrderedSet } from 'immutable'

const groupsSymbol = Symbol('groups')

export class Collection extends OrderedMap {
  static of(val) {
    return new Collection(val)
  }

  static isCollection(val) {
    return val && val instanceof Collection
  }

  __wrapImmutable(...args) {
    const res = super.__wrapImmutable(...args)

    if (res.size) {
      const groups = this[groupsSymbol] || {}
      res[groupsSymbol] = { ...groups }
    } else {
      res[groupsSymbol] = {}
    }

    return res
  }

  merge(x) {
    if (!this.size) {
      return x
    }

    const res = super.merge(x)
    if (!x instanceof Collection) {
      return res
    }

    const xGroups = x[groupsSymbol] || {}
    const groups = res[groupsSymbol] || {}

    for (const groupId in xGroups) {
      if (xGroups.hasOwnProperty(groupId)) {
        const _xGroup = xGroups[groupId] || new OrderedSet()
        const _group = groups[groupId] || new OrderedSet()

        groups[groupId] = _group.union(_xGroup)
      }
    }

    return res
  }

  addIdToGroup(groupId, id) {
    invariant(typeof groupId === 'string', 'Collection: `groupId` is expected to be an id (string).')
    invariant(typeof id === 'string', 'Collection: `id` is expected to be an id (string).')

    const groups = this[groupsSymbol]

    const _group = groups[groupId] || new OrderedSet()
    groups[groupId] = _group.add(id)

    return this
  }

  addIdsToGroup(groupId, ids) {
    invariant(typeof groupId === 'string', 'Collection: `groupId` is expected to be an id (string).')
    invariant(Set.isSet(ids) && ids.every(x => typeof x === 'string'),
      'Collection: `ids` is expected to be a Set containing ids (string).')

    const groups = this[groupsSymbol]

    const _group = groups[groupId] || new OrderedSet()
    groups[groupId] = _group.union(ids)

    return this
  }

  filterForGroup(groupId) {
    invariant(typeof groupId === 'string', 'Collection: `groupId` is expected to be an id (string).')

    const groups = this[groupsSymbol] || {}
    const _group = groups[groupId] || new OrderedSet()

    const empty = this.clear()
    if (!_group.size) {
      return empty
    }

    return empty.withMutations(map => {
      _group.forEach(id => {
        const item = this.get(id)
        if (item) {
          map.set(id, item)
        }
      })
    })
  }

  toString() {
    return this.__toString('Collection {', '}')
  }
}

export default function createCollection(obj) {
  return new Collection(obj)
}

