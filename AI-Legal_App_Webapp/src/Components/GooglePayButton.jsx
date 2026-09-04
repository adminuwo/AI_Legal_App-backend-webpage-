/**
 * GooglePayButton.jsx
 * ────────────────────
 * A complete, production-ready Google Pay button for React.
 *
 * HOW IT WORKS:
 * 1. Component loads → loads Google Pay JS SDK from Google's CDN
 * 2. Checks if user's device/browser supports Google Pay
 * 3. Shows the official Google Pay button (required by Google's branding rules)
 * 4. When user clicks → calls your backend to create a Razorpay order
 * 5. Opens Google Pay payment sheet
 * 6. User approves → your backend verifies & activates the plan
 *
 * USAGE:
 * <GooglePayButton
 *   planId="abc123"
 *   billingCycle="monthly"
 *   amount={499}
 *   currency="INR"
 *   onSuccess={(data) => console.log('Plan activated!', data)}
 *   onError={(err) => console.error(err)}
 * />
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createGooglePayOrder, verifyGooglePayment } from '../services/walletPayment.service.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const GOOGLE_PAY_SDK_URL = 'https://pay.google.com/gp/p/js/pay.js';
const GOOGLE_PAY_ENV = import.meta.env.VITE_GOOGLE_PAY_ENV || 'TEST';
const MERCHANT_ID = import.meta.env.VITE_GOOGLE_PAY_MERCHANT_ID;

// ─── Main Component ─────────────────────────────────────────────────────────

const GooglePayButton = ({
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
    const containerRef = useRef(null);
    const paymentsClientRef = useRef(null);

    // Google Pay is NOT available on iOS — Apple blocks it. Show Apple Pay instead.
    const isIOS = typeof navigator !== 'undefined' && /iPhone|iPad|iPod/.test(navigator.userAgent);

    const [status, setStatus] = useState(isIOS ? 'not-supported' : 'loading'); // 'loading' | 'ready' | 'not-supported' | 'paying' | 'error'
    const [errorMsg, setErrorMsg] = useState('');

    // ── 1. Load Google Pay SDK script ────────────────────────────────────────
    useEffect(() => {
        if (window.google?.payments?.api) {
            initializeGooglePay();
            return;
        }

        const existingScript = document.querySelector(`script[src="${GOOGLE_PAY_SDK_URL}"]`);
        if (existingScript) {
            existingScript.addEventListener('load', initializeGooglePay);
            return;
        }

        const script = document.createElement('script');
        script.src = GOOGLE_PAY_SDK_URL;
        script.async = true;
        script.onload = initializeGooglePay;
        script.onerror = () => setStatus('not-supported');
        document.head.appendChild(script);

        return () => {
            script.removeEventListener('load', initializeGooglePay);
        };
    }, []);

    // ── 2. Initialize Google Pay client & check if supported ─────────────────
    const initializeGooglePay = useCallback(async () => {
        try {
            const paymentsClient = new window.google.payments.api.PaymentsClient({
                environment: GOOGLE_PAY_ENV // 'TEST' or 'PRODUCTION'
            });

            paymentsClientRef.current = paymentsClient;

            const isReadyToPay = await paymentsClient.isReadyToPay({
                apiVersion: 2,
                apiVersionMinor: 0,
                allowedPaymentMethods: [{
                    type: 'CARD',
                    parameters: {
                        allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
                        allowedCardNetworks: ['AMEX', 'DISCOVER', 'INTERAC', 'JCB', 'MASTERCARD', 'VISA']
                    }
                }]
            });

            if (isReadyToPay.result) {
                setStatus('ready');
            } else {
                setStatus('not-supported');
            }
        } catch (err) {
            console.warn('[GooglePay] Not available:', err.message);
            setStatus('not-supported');
        }
    }, []);

    // ── 3. Handle the full payment flow ──────────────────────────────────────
    const handleGooglePay = useCallback(async () => {
        if (!paymentsClientRef.current || status !== 'ready' || disabled) return;

        setStatus('paying');
        setErrorMsg('');

        try {
            // Call your backend to get orderId + googlePayConfig
            const orderData = await createGooglePayOrder({ planId, packageId, billingCycle, currency });

            if (orderData.isFree) {
                // Free plan — no payment needed
                onSuccess?.({ isFree: true });
                setStatus('ready');
                return;
            }

            // Open the Google Pay payment sheet
            const paymentData = await paymentsClientRef.current.loadPaymentData(orderData.googlePayConfig);

            // paymentData contains the encrypted payment token from Google
            // Razorpay handles this token on the backend
            const paymentToken = paymentData.paymentMethodData?.tokenizationData?.token;
            const parsedToken = typeof paymentToken === 'string' ? JSON.parse(paymentToken) : paymentToken;

            // Verify payment on your backend → activates subscription
            const result = await verifyGooglePayment({
                razorpay_order_id: orderData.orderId,
                razorpay_payment_id: parsedToken?.razorpay_payment_id || `gpay_${Date.now()}`,
                razorpay_signature: parsedToken?.razorpay_signature || '',
                planId,
                packageId,
                billingCycle
            });

            onSuccess?.(result);
            setStatus('ready');
        } catch (err) {
            // Google Pay cancelled by user — not really an error
            if (err?.statusCode === 'CANCELED' || err?.message?.includes('CANCELED')) {
                console.log('[GooglePay] Payment cancelled by user.');
                setStatus('ready');
                return;
            }

            console.error('[GooglePay] Payment error:', err);
            const msg = err.message || 'Payment failed. Please try again.';
            setErrorMsg(msg);
            setStatus('error');
            onError?.(err);

            // Auto reset after 4 seconds
            setTimeout(() => {
                setStatus('ready');
                setErrorMsg('');
            }, 4000);
        }
    }, [status, disabled, planId, packageId, billingCycle, currency, onSuccess, onError]);

    // ── 4. Render ─────────────────────────────────────────────────────────────
    if (status === 'not-supported') return null; // Hide button if Google Pay not supported

    return (
        <div className={`gpay-button-wrapper ${className}`}>
            {status === 'loading' && (
                <div className="gpay-skeleton" aria-label="Loading Google Pay...">
                    <div className="gpay-skeleton-inner" />
                </div>
            )}

            {(status === 'ready' || status === 'paying' || status === 'error') && (
                <button
                    id="google-pay-button"
                    className={`gpay-btn ${status === 'paying' ? 'gpay-btn--loading' : ''} ${status === 'error' ? 'gpay-btn--error' : ''}`}
                    onClick={handleGooglePay}
                    disabled={status === 'paying' || disabled}
                    aria-label="Pay with Google Pay"
                    type="button"
                >
                    {status === 'paying' ? (
                        <>
                            <span className="gpay-spinner" />
                            <span>Processing…</span>
                        </>
                    ) : status === 'error' ? (
                        <>
                            <span className="gpay-icon-error">✕</span>
                            <span>Try Again</span>
                        </>
                    ) : (
                        <>
                            {/* Official Google G Logo SVG */}
                            <svg className="gpay-logo" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18c-.78 1.55-1.22 3.3-1.22 5.14s.44 3.59 1.22 5.14l3.66-2.84z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                            </svg>
                            <span className="gpay-btn-label">Pay</span>
                        </>
                    )}
                </button>
            )}

            {errorMsg && (
                <p className="gpay-error-text" role="alert">{errorMsg}</p>
            )}

            <style>{`
                .gpay-button-wrapper {
                    display: flex;
                    flex-direction: column;
                    align-items: stretch;
                    gap: 6px;
                    width: 100%;
                }

                .gpay-btn {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                    width: 100%;
                    min-height: 40px;
                    padding: 10px 14px;
                    background: #000;
                    border: none;
                    border-radius: 12px;
                    cursor: pointer;
                    font-family: inherit;
                    font-size: 0.8rem;
                    font-weight: 700;
                    color: #fff;
                    letter-spacing: 0.25px;
                    transition: background 0.2s, box-shadow 0.2s, opacity 0.2s, transform 0.1s;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                    position: relative;
                    overflow: hidden;
                    box-sizing: border-box;
                }

                .gpay-btn:hover:not(:disabled) {
                    background: #1a1a1a;
                    box-shadow: 0 4px 16px rgba(0,0,0,0.3);
                    transform: translateY(-1px);
                }

                .gpay-btn:active:not(:disabled) {
                    transform: translateY(0);
                    box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                }

                .gpay-btn:disabled {
                    opacity: 0.65;
                    cursor: not-allowed;
                }

                .gpay-btn--loading {
                    background: #1a1a1a;
                    pointer-events: none;
                }

                .gpay-btn--error {
                    background: #c0392b;
                }

                .gpay-logo {
                    width: 18px;
                    height: 18px;
                    flex-shrink: 0;
                }

                .gpay-btn-label {
                    font-size: 0.85rem;
                    font-weight: 700;
                    color: #fff;
                }

                .gpay-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-top-color: #fff;
                    border-radius: 50%;
                    animation: gpay-spin 0.75s linear infinite;
                    flex-shrink: 0;
                }

                .gpay-icon-error {
                    font-size: 14px;
                    font-weight: 700;
                }

                .gpay-error-text {
                    font-size: 11px;
                    color: #e74c3c;
                    text-align: center;
                    margin: 0;
                    padding: 0 4px;
                }

                .gpay-skeleton {
                    width: 100%;
                    min-height: 40px;
                    border-radius: 12px;
                    overflow: hidden;
                    background: rgba(255,255,255,0.06);
                }

                .gpay-skeleton-inner {
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
                    background-size: 200% 100%;
                    animation: gpay-shimmer 1.4s infinite;
                    min-height: 40px;
                }

                @keyframes gpay-spin {
                    to { transform: rotate(360deg); }
                }

                @keyframes gpay-shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>
        </div>
    );
};

export default GooglePayButton;
