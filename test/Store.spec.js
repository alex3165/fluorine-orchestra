import expect from 'expect'
import { createStore } from '../src/index'

describe('Store', () => {
  it('allows setting a pre hook', () => {
    const preHook = x => x
    const TestStore = createStore('tests')

    expect(() => {
      TestStore.pre(null)
    }).toThrow('Store: `transformer` is expected to be a function.')

    expect(TestStore.pre(preHook)).toBe(TestStore)
    expect(TestStore.hooks.pre).toBe(preHook)
  })

  it('allows setting a post hook', () => {
    const postHook = x => x
    const TestStore = createStore('tests')

    expect(() => {
      TestStore.post(null)
    }).toThrow('Store: `transformer` is expected to be a function.')

    expect(TestStore.post(postHook)).toBe(TestStore)
    expect(TestStore.hooks.post).toBe(postHook)
  })
})

