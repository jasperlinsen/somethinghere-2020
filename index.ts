import { loadLevel } from "./ts/header";
import { initContent, initPage } from  "./ts/page";

document.addEventListener( 'DOMContentLoaded', event => {

    loadLevel( 'Titlescreen' );

});

initPage( document.body );
initContent( document.body );