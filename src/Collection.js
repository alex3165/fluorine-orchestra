import invariant from 'invariant'
import { OrderedMap } from 'extendable-immutable'

export class Collection extends OrderedMap {
  static of(val) {
    return new Collection(val)
  }

  static isCollection(val) {
    return val && val instanceof Collection
  }

  constructor(val, dependencies = []) {
    super(val)

    this.dependencies = dependencies
  }

  __wrapImmutable(...args) {
    const res = super.__wrapImmutable(...args)
    res.dependencies = this.dependencies

    return res
  }

  // Returns Collection with only incomplete items
  filterComplete() {
    const { dependencies } = this

    return this.filter(x => dependencies
      .reduce((acc, key) => acc && !(
        !x.keySeq().includes(key) ||
        x.get(key) !== undefined
      ), true))
  }

  // Returns Collection with only complete items
  filterIncomplete() {
    const { dependencies } = this

    return this.filter(x => dependencies
      .reduce((acc, key) => acc && (
        !x.keySeq().includes(key) ||
        x.get(key) !== undefined
      ), true))
  }
}

export default function createCollection(obj, dependencies) {
  return new Collection(obj, dependencies)
}

