export const formatNaira = (amount: number) => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    minimumFractionDigits: 0, // Removes the .00 for cleaner UI
  }).format(amount);
};

export const calculateDiscount = (original: number, deal: number) => {
  if (!original || !deal || original <= deal) return 0;
  return Math.round(((original - deal) / original) * 100);
};