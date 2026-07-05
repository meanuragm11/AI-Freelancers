"use client";



import React, { Suspense, useState } from 'react';

import Link from 'next/link';

import SupportForm from '@/components/support/SupportForm';



function SupportPortalContent() {

  const [submitted, setSubmitted] = useState(false);

  const [ticketNumber, setTicketNumber] = useState('');



  return (

    <div className="min-h-[calc(100vh-160px)] bg-slate-50 flex flex-col items-center justify-center p-6 md:p-12">

      <div className="w-full max-w-3xl relative">

        <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-blue-400/20 rounded-full blur-3xl pointer-events-none -z-10" />



        {!submitted ? (

          <>

            <div className="text-center mb-10">

              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-black uppercase tracking-widest mb-4 shadow-sm">

                Zelance Support

              </div>

              <h1 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">

                How can we help?

              </h1>

              <p className="text-slate-500 font-medium text-lg max-w-lg mx-auto">

                Submit a request to our support team. We will review your issue and get back to you shortly.

              </p>

            </div>



            <SupportForm

              onSubmitted={(number) => {

                setTicketNumber(number);

                setSubmitted(true);

              }}

            />

          </>

        ) : (

          <div className="bg-white border border-slate-200 rounded-3xl p-12 shadow-sm text-center animate-in fade-in zoom-in duration-500 relative z-10">

            <div className="w-20 h-20 bg-green-50 border-4 border-green-100 rounded-full flex items-center justify-center mx-auto mb-6">

              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />

              </svg>

            </div>



            <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Request Submitted</h2>

            <p className="text-slate-500 font-medium text-base mb-8 max-w-md mx-auto">

              Your support ticket has been received. We will respond as soon as possible.

            </p>



            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8 max-w-sm mx-auto">

              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ticket Number</p>

              <p className="text-lg font-black text-slate-900 font-mono">{ticketNumber}</p>

            </div>



            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">

              <Link

                href={`/support/tickets/${encodeURIComponent(ticketNumber)}`}

                className="inline-block bg-slate-900 hover:bg-blue-600 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm"

              >

                View Ticket

              </Link>

              <Link

                href="/support/tickets"

                className="inline-block bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm"

              >

                My Tickets

              </Link>

            </div>

          </div>

        )}

      </div>

    </div>

  );

}



export default function SupportPortal() {

  return (

    <Suspense fallback={null}>

      <SupportPortalContent />

    </Suspense>

  );

}

