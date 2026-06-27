"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CheckoutProps {
  amountUsd: number;
  itemId: string;
  transactionType: "component_purchase" | "escrow_funding";
  buttonText?: string;
}

export default function RazorpayCheckoutButton({ amountUsd, itemId, transactionType, buttonText = "Pay Now" }: CheckoutProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setLoading(true);
    
    const res = await loadRazorpayScript();
    if (!res) {
      alert('Razorpay SDK failed to load. Are you online?');
      setLoading(false);
      return;
    }

    try {
      // 1. We must use the exact route that matches our backend logic.
      // Your backend logic was moved to /api/razorpay/order, NOT /api/checkout.
      const orderResponse = await fetch('/api/razorpay/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Added buyerId explicitly to prevent 400 errors from backend requirements
        body: JSON.stringify({ amountUsd, itemId, transactionType, buyerId: 'temp_guest' })
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) throw new Error(orderData.error || 'Failed to create order');

      const options = {
        // FIXED: Explicitly use the NEXT_PUBLIC variable 
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID, 
        amount: orderData.amountToPay * 100, // Explicitly taking backend calculation
        currency: "USD",
        name: 'Zelance Network',
        description: transactionType === 'component_purchase' ? 'Component Acquisition' : 'Escrow Funding',
        order_id: orderData.orderId,
        handler: async function (response: any) {
          // SILENT REDIRECT
          if (transactionType === 'component_purchase') {
            router.push('/buyer/library');
          } else {
            router.push(`/buyer/collabs/${itemId}`);
          }
        },
        theme: {
          color: '#0f172a' 
        }
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handlePayment} 
      disabled={loading || amountUsd <= 0}
      className="w-full bg-slate-900 hover:bg-blue-600 disabled:bg-slate-300 disabled:text-slate-500 text-white px-5 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition-colors shadow-md shadow-slate-900/10"
    >
      {loading ? 'Initializing Secure Link...' : buttonText}
    </button>
  );
}