import * as API from "../core";
import { ArrowHelper, Raycaster, Vector3 } from "three";

const raycasterArrow = new ArrowHelper(
    new Vector3( 0, 1, 0 ),
    new Vector3,
    4,
    0xffff00,
    2,
    1
);

raycasterArrow.name = 'raycaster-debugger';

export function debugRaycaster( raycaster: Raycaster, offset = API.AXES.ORIGIN ){

    API.scene.value.add( raycasterArrow );

    raycasterArrow.position.copy( raycaster.ray.origin ).add( offset );
    raycasterArrow.setDirection( raycaster.ray.direction );
    raycasterArrow.setLength( raycaster.far );
    
}