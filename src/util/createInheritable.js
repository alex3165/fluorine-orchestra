import invariant from 'invariant'

export default function createInheritable(base) {
  const proto = Object.create(base.prototype)

  for (const key in base.prototype) {
    if (base.prototype.hasOwnProperty(key)) {
      const value = base.prototype[key]

      if (typeof value === 'function') {
        // Don't expose any of the parent's methods
        proto[key] = undefined
      }
    }
  }

  const baseName = base.prototype.constructor.name
  const isMethod = base['is' + baseName]

  invariant(proto instanceof base,
    'createInheritable: Expected created prototype to be instanceof `base`.')
  invariant(!isMethod || isMethod(proto),
    `createInheritable: Expected created prototype to pass \`${baseName}.is${baseName}\`.`)

  return proto
}

