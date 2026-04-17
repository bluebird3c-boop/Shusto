/**
 * Revenue split percentages for different provider types.
 * These values represent the percentage of the total fee that goes to the provider.
 * The remainder goes to Shusto.
 */
export const PROVIDER_SHARE_PERCENTAGE: Record<string, number> = {
  doctor: 0.70,     // 70% to doctor, 30% to Shusto
  pharmacy: 0.95,   // 95% to pharmacy, 5% to Shusto
  hospital: 0.80,   // 80% to hospital, 20% to Shusto
  lab: 0.85,        // 85% to lab, 15% to Shusto
  physio: 0.75,     // 75% to physio, 25% to Shusto
  ambulance: 0.90   // 90% to ambulance, 10% to Shusto
};

/**
 * Calculates the split between the provider and Shusto.
 * @param amount Total amount paid by the patient
 * @param providerType The type of provider (doctor, pharmacy, etc.)
 * @returns An object containing the provider share and Shusto share
 */
export function calculateRevenueSplit(amount: number, providerType: string) {
  const percentage = PROVIDER_SHARE_PERCENTAGE[providerType.toLowerCase()] || 0.80; // Default to 80%
  const providerShare = amount * percentage;
  const shustoShare = amount - providerShare;

  return {
    providerShare,
    shustoShare
  };
}
