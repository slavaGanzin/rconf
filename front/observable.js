import * as R from 'ramda'
for (const f of Object.keys(R))
  window[f] = R[f]

function updateObjectInPlace(originalObject, updatedProperties) {
  if (any(test(/\./), Object.keys(updatedProperties))) {
    updatedProperties = reduce((a, [k,v]) => assocPath(split('.', k), v, a), {}, toPairs(updatedProperties))
  }

  Object.keys(updatedProperties).forEach((key) => {
    const value = updatedProperties[key];

    if (typeof value === 'object' && !Array.isArray(value)) {
      if (!originalObject[key]) originalObject[key] = {}
      updateObjectInPlace(originalObject[key], value);
    } else if (typeof value !== 'undefined') {
      originalObject[key] = value;
    }
  });

  return originalObject;
}

export const Observable = (init = {}) => {
  const subscribers = new Map();

  const handler = {
    ownKeys(target) {
      return without('__path__', Reflect.ownKeys(target))
    },
    set(target, path, value) {
      // if (typeof property === 'symbol')
      //   return true
      //
      const fullPath = Reflect.get(target, "__path__") ? `${Reflect.get(target, "__path__")}.${path}` : path
      // console.log(`Setting ${fullPath} to ${JSON.stringify(value, null, ' ') || value}`);
      const currentValue = Reflect.get(target, path)


      if (typeof value === "object" && value !== null) {
        value.__path__ = fullPath
        value = new Proxy(value, handler);
      }
      target[path] = value;

      const equal = equals(currentValue, value)
      if (equal) return true

      // console.log({fullPath, value, currentValue})
      // console.log(fullPath,
      Array.from(subscribers.keys()).map(x =>
        new RegExp(x).test(fullPath) && subscribers.get(x).map(f => f(value, ...match(new RegExp(x), fullPath)))
      )
    // )

      return true;
    },
    get: (target, property, receiver) => {
      try{
        if (target[property]) return target[property]
        if (typeof property === 'symbol')
          return Reflect.get(target, property)

        const path = property.split(".")
        let current = target
        for (let i = 0; i < path.length; i++) {
          current = current[path[i]]
          if (!current) {
            break
          }
        }
        return current
      } catch(e) {
        console.log(e)
      }
    }
  };

  init.subscribe = (path, fn) => {
    if (!subscribers.has(path)) {
      subscribers.set(path, [])
    }
    subscribers.get(path).push(fn)
    return () => {
      const subscriber = subscribers.get(path).filter(s => s !== fn)
      if (subscriber.length === 0) {
        subscribers.delete(path);
      }
      return fn
    }
  }

  init.update = partialObject => updateObjectInPlace(init, partialObject)

  init.subscribe.subscribers = subscribers

  return new Proxy(init, handler)
}

window.toNestedObject = x =>
  reduce((a,[p,v]) => assocPath(p, v, a), {}, map(y => [split('.',y), x[y]], keys(x)))

import { useState, useEffect } from "react";
import {debounce, throttle} from 'throttle-debounce'

window.useObservable = (paths, timeout = 100, log=false) => {
  if (!paths) return
  paths = split(/\s*,\s*/, paths)
  const [v,s] = useState(0)
  // const rerender = timeout ? throttle(timeout, () => s(v+1)) : () => s(v+1)
  const rerender = (...args) => {
    if (log) console.log(args)
    s(v+1)
  }
  useEffect(() => juxt(paths.map(p => State.subscribe(p, rerender))))
  return State
}
