import { Object3D, Quaternion, Vector3 } from "three";

const v2 = new Vector3;

export function getWorldDirection( object:Object3D, target?: Vector3 ){

    if( object.parent ){
        
        return object.localToWorld( new Vector3( 0, 0, 1 ) ).sub(
            object.localToWorld( v2.set( 0, 0, 0 ) )
        );

    } else {

        return new Vector3( 0, 0, 1 ).applyQuaternion( object.quaternion );

    }

}