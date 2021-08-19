/**
 * Wraps the data of the original request since it does not exist past the initial uws handler
 */
export default class RequestData {
    constructor(
        public headers: Dictionary<string>,
        public data: string,
    ) { }
}

/**
 * A helper type for object literals
 */
 export interface Dictionary<T> {
    [Key: string]: T;
}