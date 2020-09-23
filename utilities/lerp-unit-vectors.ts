import { Quaternion, Vector3 } from "three";
import { AXES } from "../constant/AXES";

const q1 = new Quaternion;
const q2 = new Quaternion;

export default function lerpUnitVectors( vectorA: Vector3, vectorB: Vector3, t: number ){

    q1.setFromUnitVectors( AXES.Z, vectorA );
    q2.setFromUnitVectors( AXES.Z, vectorB );

    vectorA.copy( AXES.Z ).applyQuaternion( q1.slerp( q2,  t ) );

    return vectorA;

}