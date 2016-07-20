import invariant from 'invariant'
import { Iterable } from 'immutable'

export default function toMap(value) {
  invariant(Iterable.isKeyed(value), 'toMap: `value` is expected to be a keyed iterable.')

  const item = new Map(value)

  invariant(typeof item.get('id') === 'string', 'toMap: `value` is expected to contain an `id`.')

  return item
}
