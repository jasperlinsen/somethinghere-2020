import { Object3D, Vector3 } from "three";

export function getWorldPosition( object:Object3D ){

    return object.parent
        ? object.parent.localToWorld( object.position.clone() )
        : object.position.clone();

}