import expect from 'expect'
import createReducerForStore from '../../src/util/createReducerForStore'
import { createStore } from '../../src/index'
import { Collection } from '../../src/Collection'
import { fromJS, List, Map } from 'immutable'

describe('createReducerForStore', () => {
  it('throws if no Store is passed', () => {
    expect(() => {
      createReducerForStore({})
    }).toThrow('Reducer: `store` is expected to be an Orchestra.Store.')
  })

  const TESTS = 'tests'

  it('ignores unrelated actions', () => {
    const reducer = createReducerForStore(createStore(TESTS))

    const action = { type: 'TESTING_OTHER_ACTIONS' }
    const state = new Collection([ new Map({ id: 'a' }) ])

    expect(reducer(state, action))
      .toBe(state)
  })

  it('ignores unknown actions', () => {
    const reducer = createReducerForStore(createStore(TESTS))

    const action = { identifier: TESTS, type: 'TESTING_OTHER_ACTIONS' }
    const state = new Collection([ new Map({ id: 'a' }) ])

    expect(reducer(state, action))
      .toBe(state)
  })


  it('processes inserts of a single item', () => {
    const TestStore = createStore(TESTS)
    const reducer = createReducerForStore(TestStore)

    const item = new Map({ id: 'a' })
    const action = TestStore.insert(item)
    const state = new Collection()

    expect(reducer(state, action).toJS())
      .toEqual({
        a: item.toJS()
      })
  })

  it('processes inserts of multiple items', () => {
    const TestStore = createStore(TESTS)
    const reducer = createReducerForStore(TestStore)

    const items = fromJS([{ id: 'a' }, { id: 'b' }])
    const action = TestStore.insert(items)
    const state = new Collection()

    expect(reducer(state, action).toJS())
      .toEqual({
        a: items.first().toJS(),
        b: items.last().toJS()
      })
  })

  it('processes deletion of an item by id', () => {
    const TestStore = createStore(TESTS)
    const reducer = createReducerForStore(TestStore)

    const action = TestStore.remove('a')
    const state = new Collection({
      a: new Map({ id: 'a' }),
      b: new Map({ id: 'b' })
    })

    expect(reducer(state, action).toJS())
      .toEqual({
        b: { id: 'b' }
      })
  })

  it('processes deletion of an item by reference', () => {
    const TestStore = createStore(TESTS)
    const reducer = createReducerForStore(TestStore)

    const item = new Map({ id: 'a' })
    const action = TestStore.remove(item)
    const state = new Collection({
      a: item,
      b: new Map({ id: 'b' })
    })

    expect(reducer(state, action).toJS())
      .toEqual({
        b: { id: 'b' }
      })
  })

  it('processes filter selectors', () => {
    const TestStore = createStore(TESTS)
    const reducer = createReducerForStore(TestStore)

    const action = TestStore.filter(x => x.get('id') !== 'a')
    const state = new Collection({
      a: new Map({ id: 'a' }),
      b: new Map({ id: 'b' })
    })

    expect(reducer(state, action).toJS())
      .toEqual({
        b: { id: 'b' }
      })
  })

  it('processes update transformers', () => {
    const TestStore = createStore(TESTS)
    const reducer = createReducerForStore(TestStore)

    const action = TestStore.update(x => x.set('test', 'test'))
    const state = new Collection({
      a: new Map({ id: 'a' })
    })

    expect(reducer(state, action).toJS())
      .toEqual({
        a: {
          id: 'a',
          test: 'test'
        }
      })
  })
})

