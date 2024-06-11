document.addEventListener("DOMContentLoaded", function () {
    const emailInput = document.getElementById("emailInput");
    const emailError = document.getElementById("emailError");
    const loginForm = document.getElementById("loginForm");

    emailInput.addEventListener("input", function () {
         const emailValue = emailInput.value;
        if (validateEmail(emailValue)) {
            emailError.style.display = "none";
            document.getElementById("login").classList.add("user-btn-primary")
        } else {
            emailError.style.display = "block";
            document.getElementById("login").classList.remove("user-btn-primary")
        }
    });

    loginForm.addEventListener("submit", function (event) {
        const emailValue = emailInput.value;
        if (!validateEmail(emailValue)) {
            emailError.style.display = "block";
            event.preventDefault();
        }
    });
    function validateEmail(email) {
        const emailPattern = /^[A-Za-z0-9\._%+\-]+@[A-Za-z0-9\.\-]+\.[A-Za-z]{2,}$/;
        return emailPattern.test(email);
    }
});