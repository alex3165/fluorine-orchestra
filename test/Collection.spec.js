import expect from 'expect'
import createCollection, { Collection } from '../src/Collection'
import { OrderedMap, Map } from 'immutable'

describe('Collection.isCollection', () => {
  it('returns if a Collection was passed', () => {
    expect(Collection.isCollection(createCollection())).toExist()
    expect(Collection.isCollection({})).toNotExist()
    expect(Collection.isCollection()).toNotExist()
  })
})

describe('Collection.of', () => {
  it('calls new Collection', () => {
    expect(Collection.of() instanceof Collection).toExist()
  })
})

describe('Collection', () => {
  it('wraps an OrderedMap and has one reference for empty collections', () => {
    expect(new Collection()).toBe(new Collection())
    expect(new Collection().data).toBeA(OrderedMap)
    expect(new Collection().toOrderedMap()).toBe(new Collection().data)
  })

  it('stringifies Collections on calling toString', () => {
    const collection = new Collection({ a: new Map() })
    expect(collection.toString()).toBe('Collection {"a":{}}')
  })

  it('throws when calling a disabled method', () => {
    expect(() => {
      createCollection().toArray()
    }).toThrow('Collection: `toArray` is not being wrapped or inherited by Collection.')
  })

  it('filters out incomplete keyed iterables on calling filterIncomplete', () => {
    const collection = createCollection({
      a: new Map({ id: 'a', test: undefined }),
      b: new Map({ id: 'b', test: 'test' })
    }, [ 'test' ])

    const filtered = collection.filterIncomplete()

    expect(filtered.getIn([ 'b', 'test' ])).toBe('test')
    expect(filtered.has('a')).toBeFalsy()
  })

  it('filters out complete keyed iterables on calling filterComplete', () => {
    const collection = createCollection({
      a: new Map({ id: 'a', test: undefined }),
      b: new Map({ id: 'b', test: 'test' })
    }, [ 'test' ])

    const filtered = collection.filterComplete()

    expect(filtered.getIn([ 'a', 'id' ])).toBe('a')
    expect(filtered.has('b')).toBeFalsy()
  })
})
