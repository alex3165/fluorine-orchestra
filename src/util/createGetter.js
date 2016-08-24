export default function createGetter(state, emptyCollection, ids) {
  if (typeof ids === 'string') {
    return function getItem() {
      return state.get(ids)
    }
  }

  return function getItems() {
    return emptyCollection.withMutations(collection => {
      ids.forEach(id => {
        const item = state.get(id)
        if (item) {
          collection.set(id, item)
        }
      })
    })
  }
}

