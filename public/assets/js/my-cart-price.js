$(document).ready(function () {
  const maxQuantity = 10;

  // Handle increment button click
  $(".increment").on("click", function () {
    var $input = $(this).closest(".cart-quantity-wrapper").find(".cart-value");
    var currentValue = parseInt($input.val());
    var productId = $input.data("product-id"); // Retrieve product ID 

    var $quantityDisplay = $("#quantity-display-" + productId);

    if (!isNaN(currentValue) && currentValue < maxQuantity) {
      var newQuantity = currentValue + 1;
      $input.val(newQuantity);
      $quantityDisplay.text(newQuantity);
      updateQuantity($input);
    } else {
      $input.val(maxQuantity);
      $quantityDisplay.text(maxQuantity);
      updateQuantity($input);
    }
  });

  // Handle decrement button click
  $(".decrement").on("click", function () {
    var $input = $(this).closest(".cart-quantity-wrapper").find(".cart-value");
    var currentValue = parseInt($input.val());
    var productId = $input.data("product-id"); // Retrieve product ID 
    var $quantityDisplay = $("#quantity-display-" + productId);

    if (!isNaN(currentValue) && currentValue > 1) {
      var newQuantity = currentValue - 1;
      $input.val(newQuantity);
      $quantityDisplay.text(newQuantity);
      updateQuantity($input);
    } else {
      $input.val(1);
      updateQuantity($input);
    }
  });

  // Handle direct input change
  $(".cart-value").on("change", function () {
    var $input = $(this);
    var currentValue = parseInt($input.val());
    var productId = $input.data("product-id"); // Retrieve product ID 
    var $quantityDisplay = $("#quantity-display-" + productId);
    if (isNaN(currentValue) || currentValue < 1) {
      $input.val(1);
      $quantityDisplay.text(1);
    } else if (currentValue > maxQuantity) {
      $input.val(maxQuantity);
      $quantityDisplay.text(maxQuantity);
    } else {
      $quantityDisplay.text(currentValue);
    }
    updateQuantity($input);
  });

  // Function to update quantity via AJAX
  function updateQuantity($input) {
    var productId = $input.attr("data-product-id");
    var cartId = $input.attr("data-cart-id");
    var newQuantity = parseInt($input.val());

    console.log(productId);
    console.log(cartId);

    // AJAX request to update quantity on server
    $.ajax({
      url: "/update-quantity",
      method: "POST",
      contentType: "application/json",
      data: JSON.stringify({ productId: productId, quantity: newQuantity , cartId: cartId }),
      success: function (response) {
        console.log("Quantity updated successfully:", response);
        // Optionally update UI or perform other actions on success

        // Update Total MRP
        var totalPriceElement = document.getElementById("totalPrice-ajax");
        if (totalPriceElement) {
          totalPriceElement.textContent = response.totalPrice;
        }

        // Update Total Discount
        var totalDiscountElement = document.getElementById("totalDiscount-ajax");
        if (totalDiscountElement) {
          totalDiscountElement.textContent = response.totalDiscount;
        }

        // Update Subtotal
        var subtotalElement = document.getElementById("subtotal-ajax");
        if (subtotalElement) {
          subtotalElement.textContent = response.subtotal;
        }

        // Update GST
        var gstElement = document.getElementById("GST-ajax");
        if (gstElement) {
          gstElement.textContent = response.GST;
        }

        // Update Delivery Fee
        var deliveryFeeElement = document.getElementById("Delivery-ajax");
        if (deliveryFeeElement) {
          deliveryFeeElement.textContent = response.deliveryFee;
        }

        // Update Total Cost
        var totalCostElement = document.getElementById("totalCost-ajax");
        if (totalCostElement) {
          totalCostElement.textContent = response.totalCost;
        }
      },
      error: function (xhr, status, error) {
        console.error("Failed to update quantity:", error);
        // Handle error scenarios if needed
      },
    });
  }
});