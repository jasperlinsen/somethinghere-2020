import { Vector3, Object3D, Mesh, SphereBufferGeometry, MeshBasicMaterial } from "three";
import * as API from "../core";

const pointSet = new Set<Object3D>();
const pointGeometry = new SphereBufferGeometry( .25, 4, 4 );
const pointMaterial = { default: new MeshBasicMaterial({ color: 'yellow' }) };

export function debugPoint( position: Vector3, color = 'default', scale = 1 ){

    if( !pointMaterial[ color ] ){

        pointMaterial[ color ] = new MeshBasicMaterial({ color });

    }

    const mesh = new Mesh( pointGeometry, pointMaterial[color] );

    mesh.position.copy( position );
    mesh.scale.set( scale, scale, scale );

    API.scene.value.add( mesh );

    const max = API.SETTINGS.FRAME_STEPPING ? 1 : 20;

    while( pointSet.size > max ){

        const removeKey = Array.from( pointSet )[0];

        removeKey.parent.remove( removeKey );
        pointSet.delete( removeKey );

    }

    pointSet.add( mesh );

}