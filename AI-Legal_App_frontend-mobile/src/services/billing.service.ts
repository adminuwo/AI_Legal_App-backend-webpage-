/**
 * AI Legal Mobile - Billing & Credits Service
 * Connects with pricing details, credit limits, subscriptions, and payment processes.
 */

import { apiClient } from '../api/client';
import { API_ENDPOINTS } from '../constants';
import { ApiResponse } from '../types';

export interface SubscriptionStatus {
  plan: 'Basic' | 'Pro' | 'Professional' | 'Premium' | 'Enterprise';
  status: 'Active' | 'Expired' | 'Pending';
  expiryDate: string | null;
  creditsBalance: number;
}

export interface CreditTransaction {
  id: string;
  action: string;
  description: string;
  credits: number;
  balanceAfter: number;
  timestamp: string;
}

export class BillingService {
  /**
   * Fetch dynamic master pricing plans config set via Admin Console.
   */
  static async getPlansConfig(): Promise<ApiResponse<any>> {
    const response = await apiClient.get('/subscription/plans');
    return response.data;
  }

  /**
   * Fetch current subscription profile details & backend entitlements for logged in user.
   */
  static async getCurrentSubscription(workspace = 'advocate'): Promise<ApiResponse<any>> {
    const response = await apiClient.get(`/subscription/current?workspace=${workspace}`);
    return response.data;
  }

  /**
   * Fetch entitlements computed by backend Entitlement Engine for target workspace.
   */
  static async getEntitlements(workspace = 'advocate'): Promise<ApiResponse<any>> {
    const response = await apiClient.get(`/subscription/entitlements?workspace=${workspace}`);
    return response.data;
  }

  /**
   * Generate short-lived purchase token & Web Billing Portal Redirect URL.
   */
  static async generateCheckoutToken(
    workspace: string,
    planId: string,
    billingCycle: 'monthly' | 'yearly',
    couponCode?: string
  ): Promise<ApiResponse<{ checkoutUrl: string; purchaseToken: string }>> {
    const response = await apiClient.post('/subscription/generate-checkout-token', {
      workspace,
      planId,
      billingCycle,
      couponCode,
    });
    return response.data;
  }

  /**
   * Fetch current subscription profile details for logged in user.
   */
  static async getSubscriptionStatus(): Promise<ApiResponse<SubscriptionStatus>> {
    const response = await apiClient.get(API_ENDPOINTS.Subscription.Status);
    return response.data;
  }

  /**
   * Retrieves active credits balance.
   */
  static async getCreditsBalance(): Promise<ApiResponse<{ credits: number }>> {
    const response = await apiClient.get(API_ENDPOINTS.Subscription.UserCredits);
    return response.data;
  }

  /**
   * Fetch logs of user credits consumption.
   */
  static async getCreditHistory(): Promise<ApiResponse<CreditTransaction[]>> {
    const response = await apiClient.get(API_ENDPOINTS.Subscription.CreditHistory);
    return response.data;
  }

  /**
   * Fetch payment audit history for account.
   */
  static async getPaymentHistory(): Promise<ApiResponse<any[]>> {
    const response = await apiClient.get('/subscription/payments/history');
    return response.data;
  }

  /**
   * Initializes pricing plan payment capture token.
   */
  static async purchasePlan(planId: string): Promise<ApiResponse<{ checkoutUrl: string; transactionId: string }>> {
    const response = await apiClient.post(API_ENDPOINTS.Subscription.PurchasePlan, { planId });
    return response.data;
  }

  /**
   * Validate coupon code server-side.
   */
  static async validateCoupon(payload: {
    couponCode: string;
    planId: string;
    billingCycle?: 'monthly' | 'yearly';
    originalAmount?: number;
  }): Promise<any> {
    const response = await apiClient.post('/subscription/validate-coupon', payload);
    return response.data;
  }

  /**
   * Create a Razorpay Order for a subscription plan (with optional couponCode).
   */
  static async createSubscriptionOrder(
    planId: string,
    billingCycle: 'monthly' | 'yearly',
    couponCode?: string
  ): Promise<ApiResponse<{ order: any; key: string; isFree?: boolean; originalAmount?: number; discountAmount?: number; finalAmount?: number; couponDetails?: any }>> {
    const response = await apiClient.post('/subscription/create-order', { planId, billingCycle, couponCode });
    return response.data;
  }

  /**
   * Verify third-party checkout callback transaction signature.
   */
  static async verifyPayment(payload: {
    transactionId: string;
    paymentToken: string;
  }): Promise<ApiResponse<{ success: boolean; subscription: SubscriptionStatus }>> {
    const response = await apiClient.post(API_ENDPOINTS.Subscription.VerifyPayment, payload);
    return response.data;
  }

  /**
   * Verify Razorpay payment signature on the backend to activate plan and unlock entitlements.
   */
  static async verifySubscriptionPayment(payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    planId: string;
    billingCycle: 'monthly' | 'yearly';
    couponCode?: string;
  }): Promise<ApiResponse<{ success: boolean; user: any; subscription: any; token?: string; entitlements?: any }>> {
    const response = await apiClient.post('/subscription/verify-payment', payload);
    return response.data;
  }

  /**
   * Admin: Get list of coupons and summary metrics
   */
  static async getAdminCoupons(): Promise<ApiResponse<any>> {
    const response = await apiClient.get('/admin/coupons');
    return response.data;
  }

  /**
   * Admin: Create new coupon
   */
  static async createAdminCoupon(data: any): Promise<ApiResponse<any>> {
    const response = await apiClient.post('/admin/coupons', data);
    return response.data;
  }

  /**
   * Admin: Get coupon details and redemption log
   */
  static async getAdminCouponDetails(couponId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.get(`/admin/coupons/${couponId}`);
    return response.data;
  }

  /**
   * Admin: Update coupon
   */
  static async updateAdminCoupon(couponId: string, data: any): Promise<ApiResponse<any>> {
    const response = await apiClient.put(`/admin/coupons/${couponId}`, data);
    return response.data;
  }

  /**
   * Admin: Toggle coupon active/inactive status
   */
  static async toggleAdminCouponStatus(couponId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.patch(`/admin/coupons/${couponId}/status`);
    return response.data;
  }

  /**
   * Admin: Toggle global coupon feature status (Active / Inactive)
   */
  static async toggleCouponFeature(enabled?: boolean): Promise<ApiResponse<any>> {
    const response = await apiClient.patch('/admin/coupons/toggle-feature', { enabled });
    return response.data;
  }

  /**
   * Admin: Soft delete coupon
   */
  static async deleteAdminCoupon(couponId: string): Promise<ApiResponse<any>> {
    const response = await apiClient.delete(`/admin/coupons/${couponId}`);
    return response.data;
  }

  /**
   * Restore past active subscription purchases for the current user.
   */
  static async restoreSubscription(): Promise<ApiResponse<{ success: boolean; user: any; message: string }>> {
    const response = await apiClient.post('/subscription/restore', {});
    return response.data;
  }

  /**
   * Cancel auto-renewal for current active subscription.
   */
  static async cancelSubscription(): Promise<ApiResponse<{ success: boolean; message: string }>> {
    const response = await apiClient.post('/subscription/cancel', {});
    return response.data;
  }

  /**
   * Enable/reactivate auto-renewal for current active subscription.
   */
  static async enableAutoRenew(): Promise<ApiResponse<{ success: boolean; autoRenew: boolean; message: string }>> {
    const response = await apiClient.post('/subscription/enable-autorenew', {});
    return response.data;
  }

  /**
   * Verify Apple StoreKit In-App Subscription receipt on backend.
   */
  static async verifyApplePurchase(payload: {
    receiptData: string;
    productId: string;
    transactionId?: string;
    workspace?: string;
    billingCycle?: 'monthly' | 'yearly';
  }): Promise<ApiResponse<{ success: boolean; user: any; subscription: any; token?: string; entitlements?: any }>> {
    const response = await apiClient.post('/subscription/apple/verify', payload);
    return response.data;
  }

  /**
   * Verify Google Play In-App Subscription purchase token on backend.
   */
  static async verifyGooglePlayPurchase(payload: {
    purchaseToken: string;
    productId: string;
    packageName?: string;
    orderId?: string;
    workspace?: string;
    billingCycle?: 'monthly' | 'yearly';
  }): Promise<ApiResponse<{ success: boolean; user: any; subscription: any; token?: string; entitlements?: any }>> {
    const response = await apiClient.post('/subscription/google-play/verify', payload);
    return response.data;
  }

  /**
   * Restore active Google Play subscription purchases on backend.
   */
  static async restoreGooglePlayPurchases(purchases: Array<{ purchaseToken: string; productId: string }>): Promise<ApiResponse<{ success: boolean; user: any; subscription?: any; message?: string }>> {
    const response = await apiClient.post('/subscription/google-play/restore', { purchases });
    return response.data;
  }
}
