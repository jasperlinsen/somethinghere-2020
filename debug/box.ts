import { Object3D, BoxHelper } from "three";
import * as API from "../core";

const boxHelperObjects = new WeakMap;
const boxHelperUpdate = (event:API.UpdateEvent) => (event.target as BoxHelper).update();

export function debugBox( object:Object3D, color = 'yellow' ){

    const helper = boxHelperObjects.has( object )
        ? boxHelperObjects.get( object )
        : new BoxHelper( object, color );

    API.scene.value.add( helper );
    API.scene.value.maps.UPDATE.add( helper );

    helper.removeEventListener( 'update', boxHelperUpdate );
    helper.addEventListener( 'update', boxHelperUpdate );

    helper.update();

    return helper;

}