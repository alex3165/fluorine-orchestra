import expect from 'expect'
import { createDispatcher } from 'fluorine-lib'
import { createStore, createOrchestra } from '../src/index'
import { fromJS, List, Map } from 'immutable'

describe('Orchestra', () => {
  it('should throw if no stores are passed', () => {
    expect(() => {
      createOrchestra()
    }).toThrow('Orchestra: constructor expects to receive Stores.')
  })

  it('should throw if multiple stores with the same identifier are passed', () => {
    expect(() => {
      createOrchestra(createStore('tests'), createStore('tests'))
    }).toThrow('Orchestra: The identifier `tests` is not unique.')
  })

  it('should throw if sth else than a Fluorine dispathcher is passed to reduce.', () => {
    expect(() => {
      createOrchestra(createStore('tests'))
        .reduce({})
    }).toThrow('Orchestra: `dispatcher` is expected to be a Fluorine dispatcher.')
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



})

