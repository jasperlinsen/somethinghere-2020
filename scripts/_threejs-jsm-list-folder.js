const fs = require( 'fs' );

let folder = process.argv[2] || '../../node_modules/three/examples/jsm/postprocessing';
let exportName = process.argv.slice(3).join('-').toLowerCase() || 'Modules';
let moduleName = process.argv.slice(3).map((v,i) => v[0].toUpperCase() + v.slice(1).toLowerCase()).join('') || 'module';

if( folder.slice( -1 ) === '/' ){

    folder = folder.slice( 0, -2 );

}

fs.readdir( folder, ( err,list ) => {

    if( err ) return console.error( 'Folder not found.', err );

    let _modules = new Set;
    let _imports = '';
    let _exports = '';
    
    list.map(file => _modules.add( file.split( '.' ).shift() ));

    _modules.forEach(module => {
        
        if( !module ) return;

        _imports += `import { ${module} as ${moduleName + module} } from "${folder}/${module}.js";\n`;
        _exports += `export const ${module} = ${moduleName + module};\n`;

    });
    fs.writeFile( `./threejs-jsm-list-${exportName}.js`, _imports + '\n\n' + _exports, function( err ){

        if( !err ) console.log( `Collected all ${exportName} into importable module!` );
        else console.error( err );

    });

});