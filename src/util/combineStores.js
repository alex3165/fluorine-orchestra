import invariant from 'invariant'
import { Observable } from '@reactivex/rxjs'
import isObservable from 'fluorine-lib/lib/util/isObservable'

export default function combineStores(stores) {
  invariant(
    typeof stores === 'object',
    'combineStores: `stores` is expected to be an object containing Observables.')

  const keys = Object.keys(stores)

  return Observable.combineLatest(
    ...keys.map(key => {
      const store = stores[key]

      invariant(
        isObservable(store),
        'combineStores: `stores` is expected to contain Observables only.')

      return store
    }),
    (...values) => values.reduce((acc, val, index) => {
      acc[keys[index]] = val
      return acc
    }, {})
  )
}
