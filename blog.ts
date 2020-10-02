import { delay } from "./ts/general";
import { initPage } from  "./ts/page";

function initBlogPage( rootElement:HTMLElement ){

    rootElement.querySelectorAll( 'pre, code' ).forEach(code => {

        code.innerHTML = code.textContent.replace( /return|var|const|let|function|\=\>|if|else|document|window|async|\;|\{|\}/gi, keyword => {

            return `<span class="keyword" style="animation-delay:-${(Math.random()*2).toFixed(2)}s">${keyword}</span>`;

        });

    });
    rootElement.querySelectorAll( 'img' ).forEach(image => {

        image.addEventListener( 'click', event => image.classList.toggle( 'expanded' ));

    });
    rootElement.querySelectorAll( '.load-more' ).forEach(loadMonth => {

        loadMonth.addEventListener( 'click', async event => {

            event.preventDefault();

            loadMonth.classList.add( 'loading' );
            loadMonth.classList.add( 'active' );

            await delay(2000);

            const page = await fetch( loadMonth.getAttribute( 'href' ) );
            const html = await page.text();
            const dom = new DOMParser().parseFromString( html, 'text/html' );
            const main = dom.querySelector( 'main' );
            
            initBlogPage( main );

            rootElement.parentNode.insertBefore( main, rootElement );
            rootElement.parentNode.insertBefore( rootElement, main );

            loadMonth.remove();

        }, { once: true });

    });

    initPage( rootElement );

}

initBlogPage( document.querySelector( 'main' ) );