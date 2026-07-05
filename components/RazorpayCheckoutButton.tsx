"use client";

import React, { useState } from 'react';
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

  const handlePayment = async () => {
    setLoading(true);
    setErrorMessage(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth');
      setLoading(false);
      return;
    }

    const res = await loadRazorpayScript();
    if (!res) {
      setErrorMessage('Razorpay SDK failed to load. Are you online?');
      setLoading(false);
      return;
    }

    try {
      const orderResponse = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUsd, itemId, transactionType, buyerId: user.id }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) throw new Error(orderData.error || 'Failed to create order');

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: Math.round(orderData.amountToPay * 100),
        currency: 'USD',
        name: 'Zelance Network',
        description:
          transactionType === 'component_purchase'
            ? 'Component Acquisition'
            : transactionType === 'revision_purchase'
              ? 'Extra Revision Purchase'
              : 'Escrow Funding',
        order_id: orderData.orderId,
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          setLoading(true);
          setErrorMessage(null);

          try {
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
          } catch (error: unknown) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : 'Payment succeeded but fulfillment failed. Please contact support.'
            );
          } finally {
            setLoading(false);
          }
        },
        theme: { color: '#0f172a' },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handlePayment}
        disabled={loading || amountUsd <= 0}
        className="w-full bg-slate-900 hover:bg-blue-600 disabled:bg-slate-300 disabled:text-slate-500 text-white px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-md shadow-slate-900/10"
      >
        {loading ? 'Initializing Secure Link...' : buttonText}
      </button>
      {errorMessage && (
        <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-700">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
