<p align="center"><img src="https://raw.githubusercontent.com/philpl/fluorine-orchestra/master/docs/intro.gif" width=400></p>
<p align="center">
<strong>Smart Collections with Dependency Resolution using <a href="https://facebook.github.io/immutable-js/">Immutable.js</a> for <a href="https://fluorinejs.org/">Fluorine</a>.</strong>
</p>

# Fluorine Orchestra

## About

Keeping a local copy of your database collections can be troublesome. Rewriting
code to handle CRUD operations, normalize incoming data and resolve dependencies
is not something to do every day.

Orchestra implements a data orchestration layer for Fluorine to easily solve
your collection worries.

- Handles data as collections with Immutable's OrderedMaps
- Simple API to describe stores and dependencies
- Automatically resolves dependencies
- Easy observing of missing items inside collections

## Quick Intro

This is just a short example that quickly presents most features of Orchestra.
It is of course not representetive for how to use it in real React projects.

```js
import { createDispatcher } from 'fluorine-lib'
import { createOrchestra, createStore } from 'fluorine-orchestra'

const dispatcher = createDispatcher()

// Create stores for your collections
const PostStore = createStore('posts')
const UserStore = createStore('users')
  .pre(user => { // Modify items before they're stored
    const firstName = user.get('firstName');
    const lastName = user.get('lastName');
    return user.set('name', firstName + ' ' + lastName);
  })
  .dependsOn( // Define dependencies between collections
    'posts',
    user => user.get('postIds', new List()), // Specify how to get the postId(s)
    (user, posts) => user.set('posts', posts) // Specify how to set posts on users
  )
  .post(user => { // Modify the dependency-resolved items before they reach your views
    const postSize = user.get('posts').size;
    return user.set('postSize', postSize);
  });

// Assemble the orchestra of stores
const orchestra = createOrchestra(PostStore, UserStore);

const {
  posts, // It spits out Fluorine stores (Observables) emitting your resolved state
  users
} = orchestra.reduce(dispatcher);

// Inserting items?
dispatcher.next(UserStore.insert({
  id: 'abc-1',
  firstName: 'John',
  lastName: 'Meyer'
}));

// Get Creative: Fetch missing ids that Orchestra can't find in its collections
const subscription = PostStore
  .observeMissing()
  .map(ids => fetchPosts(ids))
  .subscribe(dispatcher.next);
```

You can easily create stores for your different collections and define how to
transform them when they're being fed from the server into your stores.
Also define which dependencies they have and how to resolve them. The Orchestra
will combine all stores and resolve the dependencies.

The result are normal Fluorine stores (Observables). You can pass these on,
as you'd like.

If some items are missing, their ids will be reported on the respective stores.
You can use this to fetch missing data on demand.

Method to create actions to insert, remove, filter or update items on the store
are already present and can immediately be used.

## Frequently Asked Questions

### When is Fluorine Orchestra right for me?

It is a perfect fit for your project if:

- you already use or want to use Fluorine as your state and side effect manager
- your data collections are big and have complex dependencies
- you quickly want to store collections and develop rapidly
- you like using Immutable.js
