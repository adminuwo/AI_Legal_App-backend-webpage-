/**
 * walletPayment.service.js
 * ─────────────────────────
 * Helper functions for Google Pay (and future Apple Pay) API calls.
 * These talk to your MERN backend, which in turn calls Razorpay.
 */

const BASE_URL = window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || "http://localhost:8080/api";

/**
 * Get auth token from localStorage (same pattern as rest of the app)
 */
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
}

/**
 * STEP 1 — Create a Razorpay order for Google Pay
 * Returns: { orderId, amount, currency, googlePayConfig }
 *
 * @param {{ planId?: string, packageId?: string, billingCycle?: string, currency?: string }} params
 */
export async function createGooglePayOrder({ planId, packageId, billingCycle = 'monthly', currency = 'INR' }) {
    const response = await fetch(`${BASE_URL}/payment/google-pay/create-order`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ planId, packageId, billingCycle, currency })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to create Google Pay order');
    }
    return data;
}

/**
 * STEP 2 — Verify the payment after Google Pay approves
 * Call this after Razorpay's payment handler gives you the payment details.
 *
 * @param {{ razorpay_order_id, razorpay_payment_id, razorpay_signature, planId?, packageId?, billingCycle? }} params
 */
export async function verifyGooglePayment({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    planId,
    packageId,
    billingCycle
}) {
    const response = await fetch(`${BASE_URL}/payment/google-pay/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            planId,
            packageId,
            billingCycle
        })
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
        throw new Error(data.message || 'Payment verification failed');
    }
    return data;
}
