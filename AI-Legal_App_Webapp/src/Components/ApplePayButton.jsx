/**
 * ApplePayButton.jsx
 * ────────────────────
 * Apple Pay button for React — shows ONLY on Safari + Apple devices.
 * 
 * ⚠️ IMPORTANT REQUIREMENTS:
 * - Only works in Safari browser (Chrome, Firefox will hide this button automatically)
 * - Requires HTTPS (won't work on localhost — only on live domain like aimall24.com)
 * - Domain must be verified in Apple Developer Console
 * - Merchant Identity Certificate must be set up on backend
 *
 * USAGE:
 * <ApplePayButton
 *   planId="abc123"
 *   billingCycle="monthly"
 *   amount={499}
 *   currency="INR"
 *   onSuccess={(data) => console.log('Activated!', data)}
 *   onError={(err) => console.error(err)}
 * />
 */

import React, { useState, useCallback, useRef } from 'react';

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_URL = window._env_?.VITE_AISA_BACKEND_API || import.meta.env.VITE_AISA_BACKEND_API || "https://aisa24.com/api";
const APPLE_PAY_MERCHANT_ID = import.meta.env.VITE_APPLE_PAY_MERCHANT_ID || 'merchant.com.aisa24.pay';

// ⚠️ Safety check: Apple Pay REQUIRES HTTPS for both the page AND all API calls.
// If BASE_URL is HTTP (e.g. stale cached env-config), log the error and block Apple Pay.
if (BASE_URL.startsWith('http://')) {
    console.error(
        '[ApplePay] ❌ BASE_URL is insecure (HTTP). Apple Pay will be blocked.\n' +
        'BASE_URL =', BASE_URL, '\n' +
        'Fix: Ensure public/env-config.js uses https:// and redeploy.'
    );
}

// ─── Helper: Auth Headers ────────────────────────────────────────────────────

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
}

// ─── Helper: Is this an Apple device (iOS/macOS)? ───────────────────────────
// We show the Apple Pay button on ALL Apple devices, even if not Safari.
// At click time, we check if Safari is being used and guide the user if not.

function isAppleDevice() {
    if (typeof window === 'undefined') return false;
    // Must be HTTPS
    if (!window.isSecureContext) return false;
    // Detect iOS or macOS
    const ua = navigator.userAgent || '';
    const isIOS = /iPhone|iPad|iPod/.test(ua);
    const isMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 0; // iPad masquerading as Mac
    const isMacDesktop = /Macintosh/.test(ua) && !navigator.maxTouchPoints;
    return isIOS || isMac || isMacDesktop;
}

// ─── Helper: Is this Safari specifically? ────────────────────────────────────
function isSafari() {
    const ua = navigator.userAgent || '';
    return /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua) && !/FxiOS/.test(ua);
}

// ─── Helper: Can the user actually pay right now? (checked at click time) ──────
function canPayNow() {
    try {
        return window.ApplePaySession && ApplePaySession.canMakePayments();
    } catch (e) {
        return false;
    }
}


// ─── Main Component ──────────────────────────────────────────────────────────

const ApplePayButton = ({
    planId,
    packageId,
    billingCycle = 'monthly',
    amount,
    currency = 'INR',
    onSuccess,
    onError,
    disabled = false,
    className = ''
}) => {
    // ✅ Show on any Apple device; actual Safari check is done at click time
    const [supported] = useState(() => isAppleDevice());
    const [status, setStatus] = useState('ready'); // 'ready' | 'paying' | 'error'
    const [errorMsg, setErrorMsg] = useState('');
    const sessionRef = useRef(null);

    // Hide completely if not Apple device at all
    if (!supported) return null;

    // ── Full Payment Flow ──────────────────────────────────────────────────────
    const handleApplePay = useCallback(async () => {
        if (status === 'paying' || disabled) return;

        // If on Apple device but NOT Safari — guide user to open in Safari
        if (!isSafari()) {
            setStatus('error');
            setErrorMsg('Apple Pay works only in Safari. Tap to open in Safari.');
            setTimeout(() => {
                window.open(window.location.href, '_blank', 'noreferrer');
            }, 800);
            setTimeout(() => { setStatus('ready'); setErrorMsg(''); }, 4000);
            return;
        }

        // Check if the user can actually pay (card set up + domain verified)
        if (!canPayNow()) {
            setStatus('error');
            setErrorMsg('Apple Pay is not set up on this device. Please add a card in Wallet.');
            setTimeout(() => { setStatus('ready'); setErrorMsg(''); }, 4000);
            onError?.(new Error('Apple Pay not available — no card or domain not registered'));
            return;
        }

        setStatus('paying');
        setErrorMsg('');

        try {
            // ── Step 1: Create Razorpay order & get Apple Pay request config ──
            const res = await fetch(`${BASE_URL}/payment/apple-pay/create-order`, {
                method: 'POST',
                headers: getAuthHeaders(),
                credentials: 'include',
                body: JSON.stringify({ planId, packageId, billingCycle, currency })
            });

            const orderData = await res.json();
            if (!orderData.success) throw new Error(orderData.message || 'Failed to create order');

            if (orderData.isFree) {
                onSuccess?.({ isFree: true });
                setStatus('ready');
                return;
            }

            // ── Step 2: Validate applePayRequest before creating session ─────
            const req = orderData.applePayRequest;
            const AMOUNT_PATTERN = /^\d+(\.\d{2})?$/;
            if (!req || !req.total || !AMOUNT_PATTERN.test(req.total?.amount)) {
                throw new Error(
                    `Invalid Apple Pay amount format: "${req?.total?.amount}". Please try again or use another payment method.`
                );
            }

            // ── Step 3: Create Apple Pay Session ──────────────────────────────
            const session = new ApplePaySession(3, req);
            sessionRef.current = session;

            // ── Step 3: Merchant Validation (Apple calls your backend) ────────
            session.onvalidatemerchant = async (event) => {
                try {
                    const validateRes = await fetch(`${BASE_URL}/payment/apple-pay/validate-merchant`, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        credentials: 'include',
                        body: JSON.stringify({ validationURL: event.validationURL })
                    });

                    const validateData = await validateRes.json();

                    if (validateData.setupRequired) {
                        // Certificate not yet configured — expected during setup
                        session.abort();
                        setStatus('error');
                        setErrorMsg('Apple Pay setup not complete yet. Certificate needed.');
                        onError?.(new Error('Certificate not configured'));
                        return;
                    }

                    if (!validateData.success) throw new Error(validateData.message);
                    session.completeMerchantValidation(validateData.merchantSession);
                } catch (err) {
                    console.error('[ApplePay] Merchant validation failed:', err);
                    session.abort();
                    setStatus('error');
                    setErrorMsg('Apple Pay validation failed.');
                    onError?.(err);
                }
            };

            // ── Step 4: User Authorized Payment ──────────────────────────────
            session.onpaymentauthorized = async (event) => {
                try {
                    const token = event.payment.token;

                    // Send token to backend for verification + plan activation
                    const verifyRes = await fetch(`${BASE_URL}/payment/apple-pay/verify`, {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        credentials: 'include',
                        body: JSON.stringify({
                            razorpay_order_id: orderData.orderId,
                            razorpay_payment_id: `apay_${Date.now()}`,
                            razorpay_signature: '',
                            applePayToken: token,
                            planId,
                            packageId,
                            billingCycle
                        })
                    });

                    const verifyData = await verifyRes.json();

                    if (verifyData.success) {
                        session.completePayment(ApplePaySession.STATUS_SUCCESS);
                        setStatus('ready');
                        onSuccess?.(verifyData);
                    } else {
                        session.completePayment(ApplePaySession.STATUS_FAILURE);
                        throw new Error(verifyData.message || 'Payment verification failed');
                    }
                } catch (err) {
                    session.completePayment(ApplePaySession.STATUS_FAILURE);
                    setStatus('error');
                    setErrorMsg(err.message || 'Payment failed');
                    onError?.(err);
                    setTimeout(() => { setStatus('ready'); setErrorMsg(''); }, 4000);
                }
            };

            // ── Step 5: User Cancelled ────────────────────────────────────────
            session.oncancel = () => {
                console.log('[ApplePay] Payment cancelled by user.');
                setStatus('ready');
            };

            // ── Start the Apple Pay sheet ─────────────────────────────────────
            session.begin();

        } catch (err) {
            console.error('[ApplePay] Error:', err);
            setStatus('error');
            setErrorMsg(err.message || 'Something went wrong. Please try again.');
            onError?.(err);
            setTimeout(() => { setStatus('ready'); setErrorMsg(''); }, 4000);
        }
    }, [status, disabled, planId, packageId, billingCycle, currency, onSuccess, onError]);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className={`apay-button-wrapper ${className}`}>
            <button
                id="apple-pay-button"
                className={`apay-btn ${status === 'paying' ? 'apay-btn--loading' : ''} ${status === 'error' ? 'apay-btn--error' : ''}`}
                onClick={handleApplePay}
                disabled={status === 'paying' || disabled}
                aria-label="Pay with Apple Pay"
                type="button"
            >
                {status === 'paying' ? (
                    <>
                        <span className="apay-spinner" />
                        <span>Processing…</span>
                    </>
                ) : status === 'error' ? (
                    <>
                        <span className="apay-icon-error">✕</span>
                        <span>Try Again</span>
                    </>
                ) : (
                    <>
                        {/* Apple logo (SVG inline) */}
                        <svg className="apay-logo" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path
                                d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"
                                fill="white"
                            />
                        </svg>
                        <span className="apay-btn-label">Pay</span>
                    </>
                )}
            </button>

            {errorMsg && (
                <p className="apay-error-text" role="alert">{errorMsg}</p>
            )}

            <style>{`
                .apay-button-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 6px;
                    width: 100%;
                }

                .apay-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    width: 100%;
                    min-height: 48px;
                    padding: 10px 20px;
                    background: #000;
                    border: none;
                    border-radius: 10px;
                    cursor: pointer;
                    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif;
                    font-size: 15px;
                    font-weight: 600;
                    color: #fff;
                    letter-spacing: -0.3px;
                    transition: background 0.2s, box-shadow 0.2s, transform 0.1s;
                    box-shadow: 0 2px 12px rgba(0,0,0,0.3);
                }

                .apay-btn:hover:not(:disabled) {
                    background: #1a1a1a;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.45);
                    transform: translateY(-1px);
                }

                .apay-btn:active:not(:disabled) {
                    transform: translateY(0);
                }

                .apay-btn:disabled {
                    opacity: 0.65;
                    cursor: not-allowed;
                }

                .apay-btn--loading {
                    background: #1a1a1a;
                    pointer-events: none;
                }

                .apay-btn--error {
                    background: #c0392b;
                }

                .apay-logo {
                    width: 20px;
                    height: 20px;
                    flex-shrink: 0;
                }

                .apay-btn-label {
                    font-size: 15px;
                    color: #fff;
                }

                .apay-spinner {
                    width: 18px;
                    height: 18px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: apay-spin 0.75s linear infinite;
                    flex-shrink: 0;
                }

                .apay-icon-error {
                    font-size: 16px;
                    font-weight: 700;
                }

                .apay-error-text {
                    font-size: 12px;
                    color: #e74c3c;
                    text-align: center;
                    margin: 0;
                }

                @keyframes apay-spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default ApplePayButton;
