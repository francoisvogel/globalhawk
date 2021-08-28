export function Item(source) {
    var element = document.createElement('div');
    element.className = 'item';
    var image = document.createElement('img');
    image.className = 'itemInnerImage';
    image.setAttribute('src', source);
    element.appendChild(image);
    return element;
}