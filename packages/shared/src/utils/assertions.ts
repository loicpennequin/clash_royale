import type { AnyFunction, Defined, Nullable } from '../types';

export const isObject = (x: unknown): x is object =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

export const isString = (x: unknown): x is string => typeof x === 'string';

export const isNumber = (x: unknown): x is number => typeof x === 'number';

export const isBoolean = (x: unknown): x is boolean =>
  x === true || x === false;

export const isDefined = <T>(arg: Nullable<T>): arg is Defined<T> =>
  arg !== undefined && arg !== null;

export const isFunction = (x: unknown): x is AnyFunction =>
  typeof x === 'function';

export const isEmptyObject = (x: unknown) =>
  isObject(x) && Object.keys(x).length === 0;

export const isEmptyArray = (x: unknown) => Array.isArray(x) && x.length === 0;
