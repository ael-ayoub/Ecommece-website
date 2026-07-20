export interface CheckoutDetails {
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  shippingAddress: string;
}

export type CheckoutFieldErrors = Partial<
  Record<keyof CheckoutDetails, string>
>;

export function validateCheckoutDetails(
  details: CheckoutDetails,
): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};
  if (!details.contactName.trim()) errors.contactName = "Full name is required";
  if (!/^\S+@\S+\.\S+$/.test(details.contactEmail.trim())) {
    errors.contactEmail = "Enter a valid email address";
  }
  if (details.contactPhone.trim().length < 6) {
    errors.contactPhone = "Enter a valid phone number";
  }
  if (!details.shippingAddress.trim()) {
    errors.shippingAddress = "Delivery address is required";
  }
  return errors;
}

export function checkoutErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return "We could not confirm your order. Review your details and try again.";
  }
  const message = error.message.toLowerCase();
  if (message.includes("stock") || message.includes("available")) {
    return "One or more items are no longer available in the requested quantity. Return to your cart and review them.";
  }
  if (message.includes("session") || message.includes("disabled")) {
    return "Your session is no longer valid. Sign in again or continue as a guest before placing the order.";
  }
  if (message.includes("rate") || message.includes("too many")) {
    return "Too many order attempts were made. Please wait before trying again.";
  }
  return "We could not confirm your order. Your cart and delivery details are still here; please try again.";
}
