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
  it('detects equality to Collections and OrderedMaps with equals method', () => {
    const map = new OrderedMap({ a: 'a' })
    const collection = new Collection({ a: 'a' })

    expect(collection.equals(map)).toBeTruthy()
  })
})
