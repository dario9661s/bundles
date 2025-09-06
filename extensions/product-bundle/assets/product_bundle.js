function updateLineItemProperty(property, value) {
  const forms = document.querySelectorAll('form[action="/cart/add"]');

  forms.forEach(function (form) {
    const existingInputs = document.querySelectorAll("[data-mergely='true']");
    existingInputs.forEach((input) => input.remove());

    const lineItemPropertyInput = document.createElement("input");
    lineItemPropertyInput.type = "text";
    lineItemPropertyInput.id = property;
    lineItemPropertyInput.name = `properties[${property}]`;
    lineItemPropertyInput.style.display = "none";
    lineItemPropertyInput.dataset.mergely = "true";

    form.appendChild(lineItemPropertyInput);

    lineItemPropertyInput.value = value;
  });
}

const inputs = document.querySelectorAll("[id^='product-bundle-input']");

inputs.forEach(function (input) {
  const property = input.getAttribute("data-property");

  if (!property || property === "") {
    return;
  }

  input.addEventListener("input", function (e) {
    const otherInputs = Array.from(inputs).filter(
      (otherInput) => otherInput !== input,
    );
    otherInputs.forEach((otherInput) => (otherInput.value = null));

    updateLineItemProperty(property, e.target.value);
  });
});
