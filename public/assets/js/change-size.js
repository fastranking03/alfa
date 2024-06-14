 $(document).ready(function() {
    // Event listener for size change
    $('input[type="radio"][name^="selectedSize"]').change(function() {
      const productId = $(this).attr('name').split('-')[1];
      const newSize = $(this).val();
      const oldSize = $(`input[name="selectedSize-${productId}"]:checked`).val();

      console.log(newSize);
      console.log(oldSize);

      // Make an AJAX call to update the size in the backend
      $.ajax({
        url: '/update-product-size',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
          productId: productId,
          newSize: newSize,
          oldSize: oldSize
        }),
        success: function(response) {
          alert(`Size changed from ${response.old_size} to ${newSize}`);
        },
        error: function(error) {
          alert('Error updating size');
        }
      });
    });
  }); 
