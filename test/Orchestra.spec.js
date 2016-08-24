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
        .dependsOn('nothing', () => '')

      createOrchestra(TestStore).reduce(createDispatcher())
    }).toThrow('Orchestra: Failed to resolve dependency for identifier `nothing`.')
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
      .dependsOn('tests', a => a.get('test'))
    const BStore = createStore('b')
      .dependsOn('tests', b => b.get('test'))

    const orchestra = createOrchestra(AStore, BStore, TestStore)
    orchestra.reduce(createDispatcher())
  })

  it('resolves dependencies to a single other item', done => {
    const UserStore = createStore('users')
    const PostStore = createStore('posts')
      .dependsOn('users',
        post => post.get('userId'),
        (post, getUser) => {
          post.getUser = getUser
          return post
        })

    const user = new Map({ id: 'user-1', name: 'Tester' })
    const post = new Map({ id: 'post-1', userId: 'user-1', title: 'Test' })

    const orchestra = createOrchestra(UserStore, PostStore)
    const dispatcher = createDispatcher()
    const { posts, users } = orchestra.reduce(dispatcher)

    posts
      .last()
      .subscribe(_posts => {
        const x = _posts.get('post-1')

        expect(x.getUser).toBeA('function')
        expect(x.getUser()).toBe(user)
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
      .dependsOn('comments', post => post.get('commentIds'))

    const comment = new Map({ id: 'comment-1', text: 'Test' })
    const post = fromJS({ id: 'post-1', commentIds: [ 'comment-1' ], title: 'Test' })

    const orchestra = createOrchestra(CommentStore, PostStore)
    const dispatcher = createDispatcher()
    const { posts, comments } = orchestra.reduce(dispatcher)

    posts
      .last()
      .subscribe(_posts => {
        const x = _posts.get('post-1')

        expect(x.getComments).toBeA('function')
        expect(x.getComments().toJS()).toEqual({
          'comment-1': comment.toJS()
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
      .dependsOn('dependency', test => test.get('external'))
    const TestItem = new Map({ id: 'test', external: 'external' })

    const { tests } = createOrchestra(TestStore)
      .addReducer('dependency', ExternalStore)
      .reduce(dispatcher)

    tests
      .last()
      .subscribe(_tests => {
        const x = _tests.get('test')

        expect(x.getDependency).toBeA('function')
        expect(x.getDependency().toJS()).toEqual(ExternalItem.toJS())
      }, err => {
        throw err
      }, () => {
        done()
      })

    dispatcher.next(ExternalInitAction)
    dispatcher.next(TestStore.insert(TestItem))
    dispatcher.complete()
  })

  it('reports missing ids for single item dependencies', done => {
    const UserStore = createStore('users')
    const PostStore = createStore('posts')
      .dependsOn('users', post => post.get('userId'))

    const userId = 'user-1'
    const post = fromJS({ id: 'post-1', userId, title: 'Test' })

    const orchestra = createOrchestra(UserStore, PostStore)
    const dispatcher = createDispatcher()
    const { posts } = orchestra.reduce(dispatcher)

    Observable
      .zip(UserStore.observeMissing(), posts)
      .last()
      .subscribe(([ a, b ]) => {
        expect(a.toJS()).toEqual([ userId ])
        expect(b.toJS()).toEqual({
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

