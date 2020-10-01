import { Box3, Color, Plane, Quaternion, Ray, Vector2, Vector3 } from "three";

/** A full radian. */
export const RADIAN = Math.PI * 2;
/** Contains all general settings. */
export const SETTINGS = {
    QWERTY: true,
    WIREFRAME: false,
    FRAME_STEPPING: false // step trhough frame by frame
};
/** Defines useful default axes. */
export const AXES = {
    ORIGIN: new Vector3,
    X: new Vector3( 1, 0, 0 ), 
    X_NEG: new Vector3( -1, 0, 0 ),
    Y: new Vector3( 0, 1, 0 ),
    Y_NEG: new Vector3( 0, -1, 0 ),
    Z: new Vector3( 0, 0, 1 ), 
    Z_NEG: new Vector3( 0, 0, -1 ),
    POSITIVE: new Vector3( 1, 1, 1 ),
    NEGATIVE: new Vector3( -1, -1, -1 )
};
/** Provides temporary objects. Use, but do not rely on their values being correct in out-of-order execution */
export const TMP = {
    v2: new Vector2,
    v3: new Vector3,
    q: new Quaternion,
    b3: new Box3,
    r: new Ray,
    c: new Color,
    p: new Plane
};
export const MS = {
    second: 1000,
    minute: 1000 * 60,
    hour: 1000 * 60 * 60,
    day: 1000 * 60 * 60 * 24
};