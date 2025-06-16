/\*\*

- Enhanced Sleep Performance Integration Guide
-
- This guide shows how to integrate the enhanced sleep performance calculation
- into your React Native components using the new sleep analysis functions.
  \*/

// Example 1: Basic usage with default parameters
import { getEnhancedSleepMetrics } from '@/lib/health/sleep';

async function fetchBasicSleepMetrics() {
try {
const metrics = await getEnhancedSleepMetrics();
console.log('Overall Sleep Performance:', metrics.overallScore);
console.log('Sleep Need:', metrics.sleepNeed.totalNeedHours, 'hours');
} catch (error) {
console.error('Failed to fetch sleep metrics:', error);
}
}

// Example 2: Personalized sleep analysis with user preferences
async function fetchPersonalizedSleepMetrics() {
const userPreferences = {
baselineHours: 8.0, // User's baseline sleep need
strainHours: 0.5, // Additional need due to workout strain
sleepDebtHours: 1.2, // Accumulated sleep debt
napHours: 0.0 // Hours of naps taken today
};

try {
const metrics = await getEnhancedSleepMetrics(userPreferences);

    // Access individual component scores
    console.log('Hours vs Needed:', metrics.hoursVsNeeded, '%');
    console.log('Sleep Consistency:', metrics.sleepConsistency, '%');
    console.log('Sleep Efficiency:', metrics.sleepEfficiency, '%');
    console.log('Sleep Stress:', metrics.sleepStress, '%');
    console.log('Overall Score:', metrics.overallScore, '%');

    // Access sleep need breakdown
    console.log('Sleep Need Analysis:', {
      baseline: metrics.sleepNeed.baselineHours,
      strain: metrics.sleepNeed.strainHours,
      debt: metrics.sleepNeed.sleepDebtHours,
      naps: metrics.sleepNeed.napHours,
      total: metrics.sleepNeed.totalNeedHours
    });

} catch (error) {
console.error('Failed to fetch personalized sleep metrics:', error);
}
}

// Example 3: Calculate sleep debt for debt tracking
import { calculateSleepDebt } from '@/lib/health/sleep';

async function trackSleepDebt() {
try {
const targetHours = 8.0;
const currentDebt = await calculateSleepDebt(targetHours);
console.log('Current sleep debt:', currentDebt, 'hours');

    // Use this debt value in personalized calculation
    const metrics = await getEnhancedSleepMetrics({
      baselineHours: targetHours,
      sleepDebtHours: currentDebt
    });

    return metrics;

} catch (error) {
console.error('Failed to calculate sleep debt:', error);
return null;
}
}

// Example 4: Component integration with the EnhancedSleepMetrics component
import React from 'react';
import { EnhancedSleepMetrics } from '@/components/sleep/EnhancedSleepMetrics';

function SleepAnalysisScreen() {
// User preferences could come from app settings, user profile, etc.
const userPreferences = {
baselineHours: 8.0,
dailyStrainHours: 0.0, // Could be calculated from workout intensity
currentNapHours: 0.0 // Could be tracked via app or inferred from sleep data
};

return (
<EnhancedSleepMetrics userPreferences={userPreferences} />
);
}

// Example 5: Integration with existing health data context
import { use } from 'react';
import { HealthDataContext } from '@/context/HealthDataContext';

function SleepDashboard() {
const { data } = use(HealthDataContext);

// Use existing sleep data alongside enhanced metrics
const basicMetrics = data.sleep.metrics;

// Optionally fetch enhanced metrics for comparison
React.useEffect(() => {
async function fetchEnhanced() {
try {
const enhanced = await getEnhancedSleepMetrics();
console.log('Basic vs Enhanced comparison:', {
basic: basicMetrics,
enhanced: {
hoursVsNeeded: enhanced.hoursVsNeeded,
sleepConsistency: enhanced.sleepConsistency,
sleepEfficiency: enhanced.sleepEfficiency,
sleepStress: enhanced.sleepStress
}
});
} catch (error) {
console.log('Enhanced metrics not available, using basic metrics');
}
}

    fetchEnhanced();

}, [basicMetrics]);

return (
// Your component JSX here
null
);
}

/\*\*

- Key Features of Enhanced Sleep Performance:
-
- 1.  **Personalized Sleep Need**: Calculates dynamic sleep requirements based on:
- - Individual baseline needs
- - Daily strain from workouts/stress
- - Accumulated sleep debt from previous nights
- - Daytime naps that reduce nighttime requirements
-
- 2.  **Advanced Sleep Consistency**: Analyzes timing variance over multiple nights
- instead of just simple bedtime consistency
-
- 3.  **Physiological Sleep Stress**: Uses heart rate, HRV, and respiratory data
- during sleep to detect stress responses, with fallback to basic calculations
-
- 4.  **Sleep Cluster Analysis**: Automatically separates main overnight sleep
- from naps and short rest periods
-
- 5.  **Comprehensive Scoring**: Provides both individual component scores and
- an overall weighted performance score
-
- 6.  **Backward Compatibility**: Enhanced metrics seamlessly integrate with
- existing sleep data without breaking current implementations
  \*/

export {};
