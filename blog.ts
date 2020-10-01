import "./ts/page";

document.querySelectorAll( 'pre, code' ).forEach(code => {

    code.innerHTML = code.textContent.replace( /return|var|const|let|function|\=\>|if|else|document|window|async|\;|\{|\}/gi, keyword => {

        return `<span class="keyword" style="animation-delay:-${(Math.random()*2).toFixed(2)}s">${keyword}</span>`;

    });

});
document.querySelectorAll( 'img' ).forEach(image => {

    image.addEventListener( 'click', event => image.classList.toggle( 'expanded' ));

});