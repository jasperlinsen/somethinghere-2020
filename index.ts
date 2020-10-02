import { loadLevel } from "./ts/header";
import { initPage } from  "./ts/page";

document.addEventListener( 'DOMContentLoaded', event => {

    loadLevel( 'Titlescreen' );

});

initPage( document.body );