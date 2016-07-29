import createStore, { Store } from './Store'
import createOrchestra, { Orchestra } from './Orchestra'
import createCollection, { Collection } from './Collection'
import createReducerForStore from './util/createReducerForStore'
import combineStores from './util/combineStores'

import { Observable } from '@reactivex/rxjs'
import { distinctSelector } from 'fluorine-lib'
Observable.prototype.distinctSelector = distinctSelector

export {
  Store,
  Orchestra,
  Collection,
  createStore,
  createOrchestra,
  createCollection,
  createReducerForStore,
  combineStores
}
