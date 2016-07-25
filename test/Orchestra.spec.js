import expect from 'expect'
import createDispatcher from 'fluorine-lib/lib/createDispatcher'
import { Observable } from '@reactivex/rxjs'
import { createStore, createOrchestra } from '../src/index'
import { Orchestra } from '../src/Orchestra'
import { fromJS, OrderedMap, List, Map } from 'immutable'

describe('Orchestra.isOrchestra', () => {
  it('returns if an Orchestra was passed', () => {
    const TestStore = createStore('tests')
    expect(Orchestra.isOrchestra(createOrchestra(TestStore))).toExist()
    expect(Orchestra.isOrchestra({})).toNotExist()
    expect(Orchestra.isOrchestra()).toNotExist()
  })
})

describe('Orchestra', () => {
  it('throws if no stores are passed', () => {
    expect(() => {
      createOrchestra()
    }).toThrow('Orchestra: constructor expects to receive Stores.')
  })

  it('throws if multiple stores with the same identifier are passed', () => {
    expect(() => {
      createOrchestra(createStore('tests'), createStore('tests'))
    }).toThrow('Orchestra: The identifier `tests` is not unique.')
  })

  it('throws if sth else than a Fluorine dispathcher is passed to reduce.', () => {
    expect(() => {
      createOrchestra(createStore('tests'))
        .reduce({})
    }).toThrow('Orchestra: `dispatcher` is expected to be a Fluorine dispatcher.')
  })

  it('throws if a dependency is missing', () => {
    expect(() => {
      const TestStore = createStore('tests')
        .dependsOn('nothing', () => '', x => x)
      createOrchestra(TestStore).reduce(createDispatcher())
    }).toThrow('Orchestra: Failed to resolve dependency for identifier `nothing`.')
  })

  it('throws if a circular dependency is found', () => {
    expect(() => {
      const StoreA = createStore('a')
        .dependsOn('b', () => '', x => x)
      const StoreB = createStore('b')
        .dependsOn('a', () => '', x => x)

      createOrchestra(StoreA, StoreB).reduce(createDispatcher())
    }).toThrow('Orchestra: Failed to resolve circular dependency for identifier `a`.')
  })

  it('caches the reduced stores and outputs the same result on another call', () => {
    const TestStore = createStore('tests')
    const dispatcher = createDispatcher()
    const orchestra = createOrchestra(TestStore)

    expect(orchestra.reduce(dispatcher))
      .toBe(orchestra.reduce(dispatcher))
  })

  it('processes modifications on stores correctly', done => {
    const dispatcher = createDispatcher()
    const TestStore = createStore('tests')
    const orchestra = createOrchestra(TestStore)
    const { tests } = orchestra.reduce(dispatcher)
    const item = new Map({ id: 'a' })

    tests
      .takeLast(2)
      .bufferCount(2)
      .subscribe(([ x, y ]) => {
        expect(x.toJS())
          .toEqual({ a: item.toJS() })
        expect(y.toJS())
          .toEqual({})
      }, err => {
        throw err
      }, () => {
        done()
      })

    dispatcher.next(TestStore.insert(item))
    dispatcher.next(TestStore.remove(item))
    dispatcher.complete()
  })

  it('resolves multiple dependencies to a single store correctly', () => {
    const TestStore = createStore('tests')
    const AStore = createStore('a')
      .dependsOn('tests', a => a.get('test'), (a, test) => a.set('test', test))
    const BStore = createStore('b')
      .dependsOn('tests', b => b.get('test'), (b, test) => b.set('test', test))

    const orchestra = createOrchestra(AStore, BStore, TestStore)
    const dispatcher = createDispatcher()
    orchestra.reduce(dispatcher)
  })

  it('resolves dependencies to a single other item', done => {
    const UserStore = createStore('users')
    const PostStore = createStore('posts')
      .dependsOn('users',
        post => post.get('userId'),
        (post, user) => post.set('user', user))

    const user = new Map({ id: 'user-1', name: 'Tester' })
    const post = new Map({ id: 'post-1', userId: 'user-1', title: 'Test' })

    const orchestra = createOrchestra(UserStore, PostStore)
    const dispatcher = createDispatcher()
    const { posts, users } = orchestra.reduce(dispatcher)

    posts
      .last()
      .subscribe(x => {
        expect(x.toJS())
          .toEqual({
            'post-1': post
              .set('user', user)
              .toJS()
          })
      }, err => {
        throw err
      }, () => {
        done()
      })

    dispatcher.next(UserStore.insert(user))
    dispatcher.next(PostStore.insert(post))
    dispatcher.complete()
  })

  it('resolves dependencies to other items', done => {
    const CommentStore = createStore('comments')
    const PostStore = createStore('posts')
      .dependsOn('comments',
        post => post.get('commentIds'),
        (post, comments) => post.set('comments', comments))

    const comment = new Map({ id: 'comment-1', text: 'Test' })
    const post = fromJS({ id: 'post-1', commentIds: [ 'comment-1' ], title: 'Test' })

    const orchestra = createOrchestra(CommentStore, PostStore)
    const dispatcher = createDispatcher()
    const { posts, comments } = orchestra.reduce(dispatcher)

    posts
      .last()
      .subscribe(x => {
        expect(x.toJS())
          .toEqual({
            'post-1': {
              ...post.toJS(),
              comments: {
                'comment-1': comment.toJS()
              }
            }
          })
      }, err => {
        throw err
      }, () => {
        done()
      })

    dispatcher.next(CommentStore.insert(comment))
    dispatcher.next(PostStore.insert(post))
    dispatcher.complete()
  })

  it('resolves dependencies to external stores', done => {
    const dispatcher = createDispatcher()
    const ExternalInitAction = { type: 'ExternalInitAction' }
    const ExternalItem = new Map({ id: 'external' })
    const ExternalStore = (state = new OrderedMap(), action) => {
      if (action.type === 'ExternalInitAction') {
        return state.set('external', ExternalItem)
      }

      return state
    }

    const TestStore = createStore('tests')
      .dependsOn('dependency', test => test.get('external'), (test, ext) => test.set('external', ext))
    const TestItem = new Map({ id: 'test', external: 'external' })

    const { tests } = createOrchestra(TestStore)
      .addReducer('dependency', ExternalStore)
      .reduce(dispatcher)

    tests
      .last()
      .subscribe(x => {
        expect(x.toJS())
          .toEqual({
            test: {
              ...TestItem.toJS(),
              external: ExternalItem.toJS()
            }
          })
      }, err => {
        throw err
      }, () => {
        done()
      })

    dispatcher.next(ExternalInitAction)
    dispatcher.next(TestStore.insert(TestItem))
    dispatcher.complete()
  })

  it('resolves dependencies to external store using only a setter', done => {
    const dispatcher = createDispatcher()
    const ExternalStore = (state = 'test') => state

    const TestStore = createStore('tests')
      .dependsOn('dependency', (test, ext) => test.set('external', ext))
    const TestItem = new Map({ id: 'test' })

    const { tests } = createOrchestra(TestStore)
      .addReducer('dependency', ExternalStore)
      .reduce(dispatcher)

    tests
      .last()
      .subscribe(x => {
        expect(x.toJS())
          .toEqual({
            test: {
              ...TestItem.toJS(),
              external: 'test'
            }
          })
      }, err => {
        throw err
      }, () => {
        done()
      })

    dispatcher.next(TestStore.insert(TestItem))
    dispatcher.complete()
  })

  it('reports missing ids for single item dependencies', done => {
    const UserStore = createStore('users')
    const PostStore = createStore('posts')
      .dependsOn('users',
        post => post.get('userId'),
        (post, user) => post.set('user', user))

    const userId = 'user-1'
    const post = fromJS({ id: 'post-1', userId, title: 'Test' })

    const orchestra = createOrchestra(UserStore, PostStore)
    const dispatcher = createDispatcher()
    const { posts } = orchestra.reduce(dispatcher)

    Observable
      .zip(UserStore.observeMissing(), posts)
      .last()
      .subscribe(([ a, b ]) => {
        expect(a.toJS())
          .toEqual([ userId ])
        expect(b.toJS())
          .toEqual({
            'post-1': post.toJS()
          })
      }, err => {
        throw err
      }, () => {
        done()
      })

    dispatcher.next(PostStore.insert(post))
    dispatcher.complete()
  })

})

