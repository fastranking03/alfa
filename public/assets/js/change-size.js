document.addEventListener('DOMContentLoaded', function() {

  document.querySelectorAll('input[type="radio"][name^="selectedSize"]').forEach(function(radio) {
    radio.addEventListener('change', function() {
      const productId = this.name.split('-')[1];
      const newSize = this.value;

      // Get the element that displays the current size
      const sizeDisplay = document.querySelector(`.cart-short-text[data-product-id="${productId}"]`);
      const oldSize = sizeDisplay.getAttribute('data-selected-size');
      const selectedLabel = document.querySelector(`label[for="${this.id}"]`);

      // Reset the background color and class of all labels for this product
      document.querySelectorAll(`input[name="selectedSize-${productId}"]`).forEach(function(input) {
        const label = document.querySelector(`label[for="${input.id}"]`);
        label.style.backgroundColor = '';  
        label.classList.remove('cart-label');
      });

      // Make an AJAX call to update the size in the backend
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/update-product-size', true);
      xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
      xhr.onreadystatechange = function() {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status === 200) {
            const response = JSON.parse(xhr.responseText);
            sizeDisplay.setAttribute('data-selected-size', newSize);
            sizeDisplay.textContent = `Select Size : ${newSize}`;
            // Change the label background color and add the class
            // selectedLabel.style.backgroundColor = 'green';
            selectedLabel.classList.add('cart-label');
          } else {
            selectedLabel.style.backgroundColor = 'red';
          }
        }
      };
      xhr.send(JSON.stringify({
        productId: productId,
        newSize: newSize,
        oldSize: oldSize
      }));
    });
  });
});
