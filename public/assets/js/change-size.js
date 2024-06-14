 
  document.addEventListener('DOMContentLoaded', function() {
    // Event listener for size change
    document.querySelectorAll('input[type="radio"][name^="selectedSize"]').forEach(function(radio) {
      radio.addEventListener('change', function() {
        const productId = this.name.split('-')[1];
        const newSize = this.value;
        
        // Get the element that displays the current size
        const sizeDisplay = document.querySelector(`.cart-short-text[data-product-id="${productId}"]`);
        const oldSize = sizeDisplay.getAttribute('data-selected-size');

        console.log('New Size:', newSize);
        console.log('Old Size:', oldSize);

        // Make an AJAX call to update the size in the backend
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/update-product-size', true);
        xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
        xhr.onreadystatechange = function() {
          if (xhr.readyState === XMLHttpRequest.DONE) {
            if (xhr.status === 200) {
              const response = JSON.parse(xhr.responseText);
              alert(`Size changed from ${response.old_size} to ${newSize}`);
              // Update the data-selected-size attribute with the new size
              sizeDisplay.setAttribute('data-selected-size', newSize);
              sizeDisplay.textContent = `Select Size : ${newSize}`;
            } else {
              alert('Error updating size');
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
