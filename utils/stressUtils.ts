import { HealthData } from "@/context/HealthDataContext";

interface StressDataPoint extends Record<string, unknown> {
  day: number;
  stress: number;
  timeLabel: string;
}

export function generateStressChartData(healthData: HealthData): StressDataPoint[] {
  // If we have multiple HRV values, we can create a time series
  if (healthData.hrvValues.length > 1) {
    return healthData.hrvValues.map((hrv, index) => {
      // Calculate stress from HRV (inverse relationship)
      const stress = Math.max(0, Math.min(100, 100 - (hrv / 50) * 100));

      return {
        day: index + 1,
        stress,
        timeLabel: `Day ${index + 1}`,
      };
    });
  }

  // If we only have current stress level, create a simple 7-day view
  const currentStress = healthData.stressLevel;
  const days = 7;

  return Array.from({ length: days }, (_, index) => {
    // Add some variation around the current stress level
    const variation = (Math.random() - 0.5) * 20; // ±10 points variation
    const stress = Math.max(0, Math.min(100, currentStress + variation));

    const date = new Date();
    date.setDate(date.getDate() - (days - 1 - index));

    return {
      day: index + 1,
      stress,
      timeLabel: date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }),
    };
  });
}

export function getStressLevel(stressValue: number): string {
  if (stressValue < 20) return 'Low';
  if (stressValue < 40) return 'Mild';
  if (stressValue < 60) return 'Moderate';
  if (stressValue < 80) return 'High';
  return 'Maximum';
}

export function getStressColor(stressValue: number): string {
  if (stressValue < 20) return '#10b981'; // green
  if (stressValue < 40) return '#f59e0b'; // yellow
  if (stressValue < 60) return '#f97316'; // orange
  if (stressValue < 80) return '#ef4444'; // red
  return '#dc2626'; // dark red
}
