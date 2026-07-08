"use client";



import React, { useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { supabase } from '@/lib/supabaseClient';



interface CheckoutProps {

  amountUsd: number;

  itemId: string;

  transactionType: "component_purchase" | "escrow_funding" | "revision_purchase";

  buttonText?: string;

  redirectPath?: string;

  onSuccess?: () => void;

}



type OrderResponse = {

  orderId: string;

  amountToPay: number;

  amountCents: number;

  currency: string;

  keyId: string;

  error?: string;

};



type PreflightResponse = {

  success?: boolean;

  orderId: string;

  amount: number;

  amountDue: number;

  currency: string;

  status: string;

  keyId: string;

  configuredKeyId?: string;

  orderKeyId?: string | null;

  keyMatch?: boolean;

  error?: string;

};



type RazorpayHandlerResponse = {

  razorpay_order_id: string;

  razorpay_payment_id: string;

  razorpay_signature: string;

};



type RazorpayPaymentFailedResponse = {

  error?: {

    code?: string;

    description?: string;

    reason?: string;

    source?: string;

    step?: string;

    metadata?: Record<string, unknown>;

  };

};



function friendlyCheckoutError(error: unknown) {

  if (error instanceof Error && error.message) {

    return error.message;

  }

  return 'We could not open the payment window. Please try again.';

}



function formatPaymentFailureMessage(description: string, currency: string) {

  const normalized = description.toLowerCase();

  if (normalized.includes('merchant')) {

    if (currency === 'USD') {

      return `${description} Enable International Payments in your Razorpay Dashboard (Settings → International Payments) for USD checkout, or set RAZORPAY_CHECKOUT_CURRENCY=INR for domestic INR checkout.`;

    }

    return `${description} Verify your Razorpay live account is activated and the checkout key matches the key that created this order.`;

  }

  return description;

}



function logCheckoutDiagnostics(
  stage: string,
  payload: Record<string, unknown>
) {
  console.info(`[RazorpayCheckout] ${stage}`, payload);
}

function logCheckoutOpen(

  options: Record<string, unknown>,

  keyPrefix: string,

  preflight: PreflightResponse

) {

  console.info('[RazorpayCheckout] opening checkout', {

    orderId: options.order_id,

    amount: options.amount,

    currency: options.currency,

    name: options.name,

    description: options.description,

    keyPrefix,

    configuredKeyPrefix: preflight.configuredKeyId?.slice(0, 8),

    orderKeyId: preflight.orderKeyId,

    keyMatch: preflight.keyMatch,

    orderStatus: preflight.status,

    hasPrefill: Boolean(options.prefill),

    transactionType: options.transactionType,

    itemId: options.itemId,

  });

}



async function reportCheckoutError(

  orderId: string,

  error: RazorpayPaymentFailedResponse['error']

) {

  try {

    await fetch('/api/razorpay/checkout-error', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({ orderId, error }),

    });

  } catch {

    // Best-effort server logging only.

  }

}



async function preflightOrder(orderId: string): Promise<PreflightResponse> {

  const response = await fetch(`/api/razorpay/preflight?orderId=${encodeURIComponent(orderId)}`);

  const data = (await response.json()) as PreflightResponse;



  if (!response.ok) {

    throw new Error(data.error || 'Payment preflight check failed');

  }



  if (!data.orderId || !data.keyId) {

    throw new Error('Invalid payment preflight response');

  }



  if (data.status !== 'created') {

    throw new Error(`Payment order is not payable (status: ${data.status}). Please refresh and try again.`);

  }



  if (data.keyMatch === false) {

    throw new Error(

      'Payment gateway key mismatch between checkout and order. Please contact support.'

    );

  }



  return data;

}



function assertCheckoutAlignment(

  orderData: OrderResponse,

  preflight: PreflightResponse,

  checkoutAmount: number,

  checkoutCurrency: string

) {

  const orderAmount = Number(preflight.amountDue ?? preflight.amount ?? orderData.amountCents);

  const orderCurrency = (preflight.currency || orderData.currency).toUpperCase();



  logCheckoutDiagnostics('preflight.response', {

    orderId: preflight.orderId,

    amount: preflight.amount,

    amountDue: preflight.amountDue,

    currency: preflight.currency,

    status: preflight.status,

    keyIdPrefix: preflight.keyId?.slice(0, 8),

    configuredKeyPrefix: preflight.configuredKeyId?.slice(0, 8),

    orderKeyId: preflight.orderKeyId,

    keyMatch: preflight.keyMatch,

  });



  if (orderAmount !== checkoutAmount || orderCurrency !== checkoutCurrency) {

    throw new Error(

      `Payment amount mismatch (order ${orderAmount} ${orderCurrency} vs checkout ${checkoutAmount} ${checkoutCurrency}). Please refresh and try again.`

    );

  }



  if (Number(orderData.amountCents) !== checkoutAmount) {

    throw new Error(

      `Payment amount mismatch between order API (${orderData.amountCents}) and Razorpay (${checkoutAmount}). Please refresh and try again.`

    );

  }

}



export default function RazorpayCheckoutButton({

  amountUsd,

  itemId,

  transactionType,

  buttonText = "Pay Now",

  redirectPath,

  onSuccess,

}: CheckoutProps) {

  const [loading, setLoading] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkoutInFlightRef = useRef(false);

  const router = useRouter();



  const loadRazorpayScript = () => {

    return new Promise<boolean>((resolve) => {

      if ((window as any).Razorpay) {

        resolve(true);

        return;

      }

      const script = document.createElement('script');

      script.src = 'https://checkout.razorpay.com/v1/checkout.js';

      script.onload = () => resolve(true);

      script.onerror = () => resolve(false);

      document.body.appendChild(script);

    });

  };



  const createOrder = async (forceRefresh = false): Promise<OrderResponse> => {

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {

      throw new Error('AUTH_REQUIRED');

    }



    const orderResponse = await fetch('/api/razorpay/order', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({

        amountUsd,

        itemId,

        transactionType,

        buyerId: user.id,

        forceRefresh,

      }),

    });



    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {

      throw new Error(orderData.error || 'Failed to create order');

    }



    if (!orderData.orderId || !Number.isFinite(Number(orderData.amountToPay))) {

      throw new Error('Invalid payment initialization response');

    }



    if (!orderData.keyId || typeof orderData.keyId !== 'string') {

      throw new Error('Payment gateway is not configured correctly. Missing Razorpay key.');

    }



    if (!Number.isFinite(Number(orderData.amountCents))) {

      throw new Error('Invalid payment amount from server. Please refresh and try again.');

    }

    if (!orderData.currency) {

      orderData.currency = 'INR';

    }



    logCheckoutDiagnostics('order.create.response', {

      orderId: orderData.orderId,

      amountToPay: orderData.amountToPay,

      amountCents: orderData.amountCents,

      currency: orderData.currency,

      keyIdPrefix: orderData.keyId?.slice(0, 8),

      reused: Boolean((orderData as { reused?: boolean }).reused),

    });



    return orderData as OrderResponse;

  };



  const verifyPayment = async (response: RazorpayHandlerResponse) => {

    const verifyResponse = await fetch('/api/razorpay/verify', {

      method: 'POST',

      headers: { 'Content-Type': 'application/json' },

      body: JSON.stringify({

        razorpay_order_id: response.razorpay_order_id,

        razorpay_payment_id: response.razorpay_payment_id,

        razorpay_signature: response.razorpay_signature,

      }),

    });



    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok) {

      throw new Error(verifyData.error || 'Payment verification failed');

    }



    if (onSuccess) {

      await onSuccess();

    } else if (redirectPath) {

      router.push(redirectPath);

    } else if (transactionType === 'component_purchase') {

      router.push('/buyer/library');

    } else if (transactionType === 'revision_purchase') {

      router.refresh();

    } else {

      router.push(`/collab/${itemId}`);

    }

  };



  const openCheckout = (

    orderData: OrderResponse,

    preflight: PreflightResponse,

    prefill?: { name?: string; email?: string }

  ): Promise<string | null> => {

    return new Promise((resolve) => {

      let settled = false;

      const finish = (failureMessage: string | null) => {

        if (settled) return;

        settled = true;

        checkoutInFlightRef.current = false;

        setLoading(false);

        resolve(failureMessage);

      };



      const razorpayKey = preflight.keyId || orderData.keyId;

      const checkoutAmount = preflight.amountDue || preflight.amount || orderData.amountCents;

      const checkoutCurrency = (preflight.currency || orderData.currency).toUpperCase();



      if (!razorpayKey || !orderData.orderId) {

        finish('Payment gateway is not configured correctly. Please contact support.');

        return;

      }



      try {

        assertCheckoutAlignment(orderData, preflight, checkoutAmount, checkoutCurrency);

      } catch (error: unknown) {

        finish(error instanceof Error ? error.message : 'Payment preflight validation failed.');

        return;

      }



      const options: Record<string, unknown> = {

        key: razorpayKey,

        amount: checkoutAmount,

        currency: checkoutCurrency,

        order_id: String(orderData.orderId),

        name: 'Zelance Network',

        description:

          transactionType === 'component_purchase'

            ? 'Component Acquisition'

            : transactionType === 'revision_purchase'

              ? 'Extra Revision Purchase'

              : 'Escrow Funding',

        retry: { enabled: false },

        handler: async function (response: RazorpayHandlerResponse) {

          setLoading(true);

          setErrorMessage(null);



          logCheckoutDiagnostics('payment.success', {

            razorpay_order_id: response.razorpay_order_id,

            razorpay_payment_id: response.razorpay_payment_id,

            razorpay_signature_prefix: response.razorpay_signature?.slice(0, 12),

          });



          try {

            await verifyPayment(response);

            finish(null);

          } catch (error: unknown) {

            setErrorMessage(

              error instanceof Error

                ? error.message

                : 'Payment succeeded but fulfillment failed. Please contact support.'

            );

            finish(null);

          }

        },

        modal: {

          ondismiss: () => {

            finish(null);

          },

        },

        theme: { color: '#0f172a' },

      };



      if (prefill?.name || prefill?.email) {

        options.prefill = {

          ...(prefill.name ? { name: prefill.name } : {}),

          ...(prefill.email ? { email: prefill.email } : {}),

        };

      }



      logCheckoutOpen(

        {

          ...options,

          transactionType,

          itemId,

        },

        razorpayKey.slice(0, 8),

        preflight

      );



      logCheckoutDiagnostics('checkout.open.options', {

        key: razorpayKey,

        amount: checkoutAmount,

        currency: checkoutCurrency,

        order_id: orderData.orderId,

        name: options.name,

        description: options.description,

        prefill: options.prefill ?? null,

      });



      const paymentObject = new (window as any).Razorpay(options);



      paymentObject.on('payment.failed', (response: RazorpayPaymentFailedResponse) => {

        console.error('[RazorpayCheckout] payment.failed', response.error);

        void reportCheckoutError(orderData.orderId, response.error);



        const description =

          response.error?.description ||

          response.error?.reason ||

          'Payment could not be completed.';

        finish(formatPaymentFailureMessage(description, checkoutCurrency));

      });



      paymentObject.open();

    });

  };



  const handlePayment = async () => {

    if (checkoutInFlightRef.current || loading) {

      return;

    }



    checkoutInFlightRef.current = true;

    setLoading(true);

    setErrorMessage(null);



    try {

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {

        router.push('/auth');

        return;

      }



      const scriptLoaded = await loadRazorpayScript();

      if (!scriptLoaded) {

        setErrorMessage('Razorpay SDK failed to load. Are you online?');

        return;

      }



      let orderData = await createOrder(false);

      let preflight = await preflightOrder(orderData.orderId);

      let failureMessage = await openCheckout(orderData, preflight, {

        email: user.email ?? undefined,

        name:

          (user.user_metadata?.full_name as string | undefined) ??

          (user.user_metadata?.name as string | undefined),

      });



      if (failureMessage) {

        setErrorMessage('Refreshing your payment link and trying once more...');

        checkoutInFlightRef.current = true;

        setLoading(true);



        orderData = await createOrder(true);

        preflight = await preflightOrder(orderData.orderId);

        failureMessage = await openCheckout(orderData, preflight, {

          email: user.email ?? undefined,

          name:

            (user.user_metadata?.full_name as string | undefined) ??

            (user.user_metadata?.name as string | undefined),

        });



        if (failureMessage) {

          setErrorMessage(`${failureMessage} Please try again in a moment.`);

        }

      }

    } catch (error: unknown) {

      if (error instanceof Error && error.message === 'AUTH_REQUIRED') {

        router.push('/auth');

        return;

      }

      setErrorMessage(friendlyCheckoutError(error));

    } finally {

      checkoutInFlightRef.current = false;

      setLoading(false);

    }

  };



  return (

    <div>

      <button

        type="button"

        onClick={handlePayment}

        disabled={loading || amountUsd <= 0}

        aria-busy={loading}

        className="w-full bg-slate-900 hover:bg-blue-600 disabled:bg-slate-300 disabled:text-slate-500 text-white px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-md shadow-slate-900/10"

      >

        {loading ? 'Initializing Secure Link...' : buttonText}

      </button>

      <p className="mt-2 text-[10px] font-medium text-slate-500 text-center leading-relaxed">

        Prices are listed in USD. Checkout is processed in INR via Razorpay unless your admin sets{' '}

        <span className="font-bold">RAZORPAY_CHECKOUT_CURRENCY=USD</span> and enables International Payments.

      </p>

      {errorMessage && (

        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">

          {errorMessage}

        </p>

      )}

    </div>

  );

}


