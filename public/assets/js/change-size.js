 
  document.addEventListener('DOMContentLoaded', function() {
    // Highlight the default selected size
    document.querySelectorAll('input[type="radio"][name^="selectedSize"]:checked').forEach(function(radio) {
      const label = document.querySelector(`label[for="${radio.id}"]`);
      label.classList.add('selected-size');
    });

    // Add change event listener to update the size and highlight the selected size
    document.querySelectorAll('input[type="radio"][name^="selectedSize"]').forEach(function(radio) {
      radio.addEventListener('change', function() {
        const cartId = this.name.split('-')[1];
        const newSize = this.value;

        // Get the element that displays the current size
        const sizeDisplay = document.querySelector(`.cart-short-text[data-cart-id="${cartId}"]`);
        const oldSize = sizeDisplay.getAttribute('data-selected-size');
        const selectedLabel = document.querySelector(`label[for="${this.id}"]`);
        
        // Get the product ID from the data attribute
        const productId = sizeDisplay.getAttribute('data-product-id');

        // Reset the background color and class of all labels for this item
        document.querySelectorAll(`input[name="selectedSize-${cartId}"]`).forEach(function(input) {
          const label = document.querySelector(`label[for="${input.id}"]`);
          label.classList.remove('selected-size');
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
              selectedLabel.classList.add('selected-size');
            } else {
              selectedLabel.style.backgroundColor = 'red';
            }
          }
        };
        xhr.send(JSON.stringify({
          cartId: cartId,
          newSize: newSize,
          oldSize: oldSize,
          productId: productId // Include productId in the request
        }));
      });
    });
  }); 
