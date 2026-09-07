import React from 'react';
import type { FineEntry } from '../types';
import { isFinePaymentOpen, paymentAvailabilityMessage } from '../services/paymentService';

export const PaymentAvailability: React.FC<{ fine: FineEntry }> = ({ fine }) =>
  fine.status === 'unpaid' && !isFinePaymentOpen(fine)
    ? <p className="text-xs text-slate-500 mt-1 whitespace-normal">{paymentAvailabilityMessage(fine)}</p>
    : null;
