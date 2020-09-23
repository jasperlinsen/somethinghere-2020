import { loadLevel, delay } from "./core";
import { mailey, phoney } from "./levels/titlescreen";

loadLevel( 'Titlescreen' );

document.querySelectorAll( 'a[href="tel:sorry-needs-javascript"]' ).forEach(tel => {

    tel.setAttribute( 'href', `tel:${phoney()}` );

});
document.querySelectorAll( 'a[href="mailto:sorry-needs-javascript"]' ).forEach(tel => {

    tel.setAttribute( 'href', `mailto:${mailey()}` );

});
document.querySelectorAll( 'a[href="twitter:sorry-needs-javascript"]' ).forEach(tel => {

    tel.setAttribute( 'href', `twitter:@jasperlinsen` );

});
document.querySelectorAll( '.full-year' ).forEach(year => {

    year.textContent = '2018-' + new Date().getFullYear().toString();

});
document.querySelectorAll( 'blockquote' ).forEach(quote => {

    quote.addEventListener( 'click', event => {

        document.querySelectorAll( 'blockquote' ).forEach(quote => {

            quote.classList.remove( 'expanded' );

        });

        quote.classList.add( 'expanded' );

    })

});
document.querySelectorAll( '.gallery' ).forEach(async (gallery:HTMLElement, index:number) => {

    await delay( 500 * index );
    
    gallery.addEventListener( 'mouseenter', e => {

        gallery.style.setProperty( '--rotate', (Math.random() * 8 - 4).toFixed(3) + 'deg' );

    });

    const images: HTMLImageElement[] = Array.from( gallery.querySelectorAll( 'img' ) );
    
    while( true ) for( let img of images ){

        img.classList.add( 'selected' );

        await Promise.race([
            delay( parseInt( gallery.getAttribute( 'duration' ) || '5000' ) ),
            new Promise(r => img.addEventListener( 'click', r, { once: true }))
        ]);

        img.classList.remove( 'selected' );

    }

});