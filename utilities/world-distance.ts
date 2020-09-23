import { Vector3, Object3D } from "three";

const v1 = new Vector3;
const v2 = new Vector3;

export function getWorldDistance( object1:Object3D, object2:Object3D ){

    v1.copy( object1.position );
    v2.copy( object2.position );
    
    if( object1.parent ) object1.parent.localToWorld( v1 );
    if( object2.parent ) object2.parent.localToWorld( v2 );
    
    return v1.distanceTo( v2 );

}