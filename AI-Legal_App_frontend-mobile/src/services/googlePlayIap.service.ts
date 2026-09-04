/**
 * AI Legal Mobile - Google Play In-App Purchase (IAP) Service
 * Compatible with react-native-iap v15 (Nitro / OpenIAP architecture)
 * Safely handles missing native NitroModules in Expo Go / JS-only environments.
 */

import { Platform, NativeModules } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { BillingService } from './billing.service';

/**
 * Dynamic Product SKUs matching Google Play Console Subscriptions
 */
export const PLAY_SUBSCRIPTION_SKUS = [
  // Advocate Workspace
  'advocate_basic',
  'advocate_pro',
  'advocate_premium',

  // Student Workspace
  'student_basic',
  'student_pro',
  'student_premium',

  // Law Firm Workspace
  'firm_basic',
  'firm_pro',
  'firm_premium',

  // Combo Workspace
  'combo_student_advocate',
  'combo_advocate_firm',
  'combo_all_access',
];

export interface GooglePlayStoreSubscription {
  productId: string;
  title: string;
  description: string;
  localizedPrice: string;
  currency: string;
  priceAmountMicros?: number;
  rawItem?: any;
}

/**
 * Safely load react-native-iap module at runtime without crashing app startup in Expo Go or older native binaries
 */
function getIapModule(): any {
  const isExpoGo = 
    Constants.appOwnership === 'expo' || 
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

  if (isExpoGo) {
    return null;
  }

  try {
    const iap = require('react-native-iap');
    if (typeof iap.isNitroReady === 'function') {
      const ready = iap.isNitroReady();
      if (!ready) {
        return null;
      }
    }
    return iap;
  } catch (err) {
    return null;
  }
}

class GooglePlayIapService {
  private isConnected: boolean = false;
  private purchaseUpdateSub: any = null;
  private purchaseErrorSub: any = null;
  private pendingPurchase: { productId: string; billingCycle: 'monthly' | 'yearly'; workspace: string } | null = null;
  private onSuccessCallback: ((result: any) => void) | null = null;

  /**
   * Initialize Google Play / App Store Billing connection safely.
   */
  async initialize(): Promise<boolean> {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return false;

    const iap = getIapModule();
    if (!iap) {
      this.isConnected = false;
      return false;
    }

    const initConn = iap?.initConnection || iap?.default?.initConnection;
    if (typeof initConn !== 'function') {
      this.isConnected = false;
      return false;
    }

    try {
      this.isConnected = await initConn();
      console.log('[NativeIAP] Native Store connection initialized:', this.isConnected);
      return this.isConnected;
    } catch (err: any) {
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Fetch active subscription offers & localized prices directly from Google Play / App Store.
   */
  async fetchPlaySubscriptions(skus: string[] = PLAY_SUBSCRIPTION_SKUS): Promise<GooglePlayStoreSubscription[]> {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return [];

    const iap = getIapModule();
    const fetchProd = iap?.fetchProducts || iap?.default?.fetchProducts;
    if (!iap || typeof fetchProd !== 'function') {
      return [];
    }

    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      const products = await fetchProd({ skus, type: 'subs' });
      if (!products || !Array.isArray(products)) return [];

      console.log(`[NativeIAP] Fetched ${products.length} active store subscriptions.`);

      return products.map((sub: any) => {
        let localizedPrice = sub.displayPrice || sub.localizedPrice || sub.price || '₹499';
        let currency = sub.currency || 'INR';

        if (sub.subscriptionOfferDetailsAndroid && sub.subscriptionOfferDetailsAndroid.length > 0) {
          const offer = sub.subscriptionOfferDetailsAndroid[0];
          const pricingPhase = offer.pricingPhases?.pricingPhaseList?.[0];
          if (pricingPhase) {
            localizedPrice = pricingPhase.formattedPrice;
            currency = pricingPhase.priceCurrencyCode;
          }
        }

        return {
          productId: sub.id || sub.productId,
          title: sub.title || sub.id || '',
          description: sub.description || '',
          localizedPrice,
          currency,
          rawItem: sub,
        };
      });
    } catch (err: any) {
      return [];
    }
  }

  /**
   * Subscribe to Product ID.
   */
  async purchaseSubscription(
    productId: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
    workspace: string = 'advocate',
    offerToken?: string
  ): Promise<boolean> {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return false;
    this.pendingPurchase = { productId, billingCycle, workspace };

    const iap = getIapModule();
    if (!iap) {
      throw new Error(
        'Apple In-App Purchase sheet requires a native iOS Development Build (npx expo run:ios or EAS Dev Build). Expo Go does not support StoreKit.'
      );
    }

    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      console.log(`[NativeIAP] Initiating native purchase on ${Platform.OS} for SKU: ${productId}`);

      if (Platform.OS === 'ios') {
        // Warm up StoreKit product cache for Apple ID Sandbox
        const fetchProd = iap?.fetchProducts || iap?.default?.fetchProducts;
        if (typeof fetchProd === 'function') {
          console.log('[NativeIAP] Fetching StoreKit product details for:', productId);
          await fetchProd({ skus: [productId], type: 'subs' }).catch((e: any) => {
            console.warn('[NativeIAP] fetchProducts warmup warning:', e?.message || e);
          });
        }

        const reqPur = iap.requestPurchase || iap.default?.requestPurchase;
        const reqSub = iap.requestSubscription || iap.default?.requestSubscription;

        let requestSuccess = false;
        let lastError: any = null;

        // Try standard OpenIAP / react-native-iap v16 requestPurchase first
        if (typeof reqPur === 'function') {
          console.log('[NativeIAP] Calling iap.requestPurchase for iOS StoreKit:', productId);
          try {
            await reqPur({
              request: {
                apple: {
                  sku: productId,
                },
              },
              type: 'subs',
            });
            requestSuccess = true;
          } catch (e1: any) {
            console.warn('[NativeIAP] v16 requestPurchase failed, attempting fallback:', e1?.message || e1);
            lastError = e1;
          }
        }

        if (!requestSuccess && typeof reqPur === 'function') {
          try {
            await reqPur({ sku: productId });
            requestSuccess = true;
          } catch (e2: any) {
            console.warn('[NativeIAP] direct sku requestPurchase error, trying reqSub:', e2?.message || e2);
            lastError = e2;
          }
        }

        if (!requestSuccess && typeof reqSub === 'function') {
          try {
            console.log('[NativeIAP] Calling iap.requestSubscription for iOS:', productId);
            await reqSub({ sku: productId });
            requestSuccess = true;
          } catch (e3: any) {
            console.warn('[NativeIAP] requestSubscription error:', e3?.message || e3);
            lastError = e3;
          }
        }

        if (!requestSuccess && lastError) {
          throw lastError;
        }

        return true;
      } else {
        const subscriptionOffers = offerToken
          ? [{ sku: productId, offerToken }]
          : [{ sku: productId, offerToken: '' }];

        await iap.requestPurchase({
          type: 'subs',
          request: {
            google: {
              skus: [productId],
              subscriptionOffers,
            },
          },
        });
      }

      return true;
    } catch (err: any) {
      console.warn('[NativeIAP] Native requestPurchase error:', err?.message || err);

      const errCode = err?.code || '';
      const errMessage = err?.message || err?.debugMessage || '';

      if (
        errCode === 'sku-not-found' ||
        errCode === 'E_IAP_NOT_AVAILABLE' ||
        errMessage.includes('SKU not found') ||
        errMessage.includes('not available') ||
        errMessage.includes('Billing client')
      ) {
        console.log(`[NativeIAP] SKU "${productId}" not available on Store. Falling back to Web Checkout...`);
        throw new Error('PLAY_STORE_UNAVAILABLE');
      }

      throw err;
    }
  }

  /**
   * Set up global purchase listeners to capture successful Store purchases and handle token verification.
   */
  setupPurchaseListeners(
    onSuccess: (result: any) => void,
    onError: (error: any) => void
  ) {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return;

    this.removePurchaseListeners();
    this.onSuccessCallback = onSuccess;

    const iap = getIapModule();
    const purchaseUpdateListener = iap?.purchaseUpdatedListener || iap?.default?.purchaseUpdatedListener;
    const purchaseErrorListener = iap?.purchaseErrorListener || iap?.default?.purchaseErrorListener;
    const finishTransactionFn = iap?.finishTransaction || iap?.default?.finishTransaction;

    if (!iap || typeof purchaseUpdateListener !== 'function') {
      console.warn('[NativeIAP] purchaseUpdatedListener function not found on module');
      return;
    }

    try {
      this.purchaseUpdateSub = purchaseUpdateListener(async (purchase: any) => {
        console.log('[NativeIAP] purchaseUpdatedListener triggered:', purchase?.productId);

        try {
          const token = purchase?.transactionReceipt || purchase?.jwsRepresentation || purchase?.verificationResultIOS || purchase?.purchaseToken || purchase?.transactionId;
          const targetProductId = purchase?.productId || this.pendingPurchase?.productId || 'advocate_pro';
          const targetTransactionId = purchase?.transactionId || purchase?.originalTransactionIdentifierIOS || `TX-${Date.now()}`;

          if (!token) {
            onError({ message: 'Purchase token / receipt missing from Store callback.' });
            return;
          }

          console.log('\n======================================================');
          console.log(`💳 [Native IAP] ${Platform.OS.toUpperCase()} Purchase Callback Received!`);
          console.log(`📦 Product ID: ${targetProductId}`);
          console.log(`🎟️ Transaction ID: ${targetTransactionId}`);
          console.log('======================================================\n');

          // Verify with backend
          let verificationRes;
          if (Platform.OS === 'ios') {
            console.log('🍎 [Native IAP] Sending Apple Receipt to Backend for Verification...');
            verificationRes = await BillingService.verifyApplePurchase({
              receiptData: token,
              productId: targetProductId,
              transactionId: targetTransactionId,
              workspace: this.pendingPurchase?.workspace || 'advocate',
              billingCycle: this.pendingPurchase?.billingCycle || 'monthly',
            });
            console.log('✅ [Native IAP] Apple Backend Verification Success:', verificationRes?.message || 'Unlocked!');
          } else {
            console.log('🤖 [Native IAP] Sending Google Play Token to Backend for Verification...');
            verificationRes = await BillingService.verifyGooglePlayPurchase({
              purchaseToken: token,
              productId: targetProductId,
              orderId: targetTransactionId || purchase.orderId || `STORE.LIVE-${Date.now()}`,
              packageName: purchase.packageNameAndroid || 'com.uwo.ailegal',
            });
            console.log('✅ [Native IAP] Google Backend Verification Success:', verificationRes?.message || 'Unlocked!');
          }

          // Finish transaction with Store
          if (typeof finishTransactionFn === 'function') {
            await finishTransactionFn({ purchase, isConsumable: false });
          }

          onSuccess(verificationRes);
        } catch (err: any) {
          console.error('[NativeIAP] Listener verification error:', err);
          onError(err);
        }
      });

      if (typeof purchaseErrorListener === 'function') {
        this.purchaseErrorSub = purchaseErrorListener(async (error: any) => {
          const isCancelled = typeof iap.isUserCancelledError === 'function' ? iap.isUserCancelledError(error) : error?.code === 'E_USER_CANCELLED';
          const isSkuNotFound = error?.code === 'sku-not-found' || error?.message?.includes('SKU not found');

          if (isSkuNotFound) {
            console.log('[NativeIAP] Handling sku-not-found in purchaseErrorListener, triggering Web Checkout fallback...');
            onError(error);
            return;
          }

          if (!isCancelled) {
            console.warn('[NativeIAP] purchaseErrorListener:', error);
            onError(error);
          }
        });
      }
    } catch (err: any) {
      console.warn('[NativeIAP] setupPurchaseListeners warning:', err?.message || err);
    }
  }

  /**
   * Remove purchase listeners on unmount.
   */
  removePurchaseListeners() {
    if (this.purchaseUpdateSub) {
      try {
        if (typeof this.purchaseUpdateSub.remove === 'function') {
          this.purchaseUpdateSub.remove();
        }
      } catch (e) {
        // ignore
      }
      this.purchaseUpdateSub = null;
    }
    if (this.purchaseErrorSub) {
      try {
        if (typeof this.purchaseErrorSub.remove === 'function') {
          this.purchaseErrorSub.remove();
        }
      } catch (e) {
        // ignore
      }
      this.purchaseErrorSub = null;
    }
  }

  /**
   * Restore purchases from Store.
   */
  async restorePurchases(): Promise<any> {
    if (Platform.OS !== 'android' && Platform.OS !== 'ios') return null;

    const iap = getIapModule();
    if (!iap || typeof iap.getAvailablePurchases !== 'function') {
      return await BillingService.restoreSubscription();
    }

    try {
      if (!this.isConnected) {
        await this.initialize();
      }

      const purchases = await iap.getAvailablePurchases();
      console.log(`[NativeIAP] Restored ${purchases?.length || 0} available purchases from Store.`);

      if (Platform.OS === 'ios') {
        if (purchases && purchases.length > 0) {
          const latestPurchase = purchases[purchases.length - 1];
          const token = latestPurchase?.transactionReceipt || latestPurchase?.jwsRepresentation || latestPurchase?.verificationResultIOS || latestPurchase?.transactionId;
          const res = await BillingService.verifyApplePurchase({
            receiptData: token,
            productId: latestPurchase.productId,
            transactionId: latestPurchase.transactionId,
          });
          return res;
        }
        return await BillingService.restoreSubscription();
      } else {
        const mappedPurchases = (purchases || [])
          .filter((p: any) => !!p.purchaseToken)
          .map((p: any) => ({
            purchaseToken: p.purchaseToken!,
            productId: p.productId,
          }));

        const res = await BillingService.restoreGooglePlayPurchases(mappedPurchases);
        return res;
      }
    } catch (err: any) {
      console.warn('[NativeIAP] restorePurchases error:', err?.message || err);
      return await BillingService.restoreSubscription();
    }
  }

  /**
   * Simulate a Sandbox Purchase flow when running in Expo Go or Emulator without native StoreKit / Play Store client.
   */
  private async simulateSandboxPurchase(
    productId: string,
    billingCycle: 'monthly' | 'yearly',
    workspace: string
  ): Promise<any> {
    if (!__DEV__) {
      return false;
    }

    if (Platform.OS === 'ios') {
      const sandboxReceipt = `SANDBOX_APPLE_${Date.now()}`;
      const res = await BillingService.verifyApplePurchase({
        receiptData: sandboxReceipt,
        productId,
        transactionId: `APPLE-SANDBOX-${Date.now()}`,
        billingCycle,
        workspace,
      });
      return (res && (res as any).success) ? res : false;
    } else {
      const sandboxToken = `sandbox_token_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const sandboxOrderId = `GPA.SANDBOX-${Date.now()}`;

      const res = await BillingService.verifyGooglePlayPurchase({
        purchaseToken: sandboxToken,
        productId,
        orderId: sandboxOrderId,
        billingCycle,
        workspace,
      });

      return (res && (res as any).success) ? res : false;
    }
  }

  /**
   * Cleanup connection
   */
  async dispose() {
    this.removePurchaseListeners();
    if (this.isConnected) {
      try {
        const iap = getIapModule();
        if (iap && typeof iap.endConnection === 'function') {
          await iap.endConnection();
        }
        this.isConnected = false;
      } catch (e) {
        // ignore
      }
    }
  }
}

export const googlePlayIapService = new GooglePlayIapService();
