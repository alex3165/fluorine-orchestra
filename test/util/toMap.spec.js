import expect from 'expect'
import toMap from '../../src/util/toMap'
import { Seq, Map } from 'immutable'

describe('toMap', () => {
  it('throws if no keyed iterable is passed', () => {
    expect(() => {
      toMap()
    }).toThrow('toMap: `value` is expected to be a keyed iterable.')
  })

  it('throws if no id is part of the value', () => {
    expect(() => {
      toMap(new Map({ notAnId: 'oops' }))
    }).toThrow('toMap: `value` is expected to contain an `id`')
  })

  it('transforms keyed iterables to Maps', () => {
    const item = { id: 'test' }

    expect(
      toMap(new Seq(item))
        .equals(new Map(item))
    ).toBe(true)
  })

  it('leaves Maps unchanged', () => {
    const item = new Map({ id: 'test' })

    expect(toMap(item))
      .toBe(item)
  })
})

