# Enhanced Sleep Performance Calculation

This implementation provides a comprehensive sleep analysis system based on the latest sleep science research, similar to systems used by WHOOP and other advanced sleep tracking platforms.

## Key Features

### 1. Personalized Sleep Need Calculation
The system calculates individual sleep need based on:
- **Baseline Sleep**: Personal baseline requirement (typically 7-8 hours)
- **Strain**: Additional sleep needed due to physical/mental stress
- **Sleep Debt**: Accumulated deficit from previous nights
- **Naps**: Daytime sleep that reduces nighttime need

### 2. Advanced Sleep Metrics

#### Hours vs. Needed (Sleep Quantity)
- Compares actual sleep to personalized sleep need
- Accounts for individual variations and daily requirements
- Expressed as percentage of need fulfilled

#### Sleep Consistency (Schedule Regularity)
- Analyzes bedtime and wake time variance over 5 nights
- Measures deviation from ideal 24-hour rhythm
- Higher scores indicate more regular sleep schedule

#### Sleep Efficiency (Sleep Quality)
- Ratio of time asleep to time in bed
- Indicates how quickly you fall asleep and stay asleep
- Higher efficiency means better sleep quality

#### Sleep Stress (Physiological Rest)
- Uses heart rate, HRV, and respiratory data during sleep
- Identifies periods of elevated physiological stress
- Higher scores indicate more restful sleep

### 3. Overall Performance Score
Weighted combination of all components providing holistic sleep assessment.

## Usage Examples

### Basic Usage
```typescript
import { getEnhancedSleepMetrics } from '@/lib/health/sleep';

// Get enhanced metrics with default parameters
const metrics = await getEnhancedSleepMetrics();
console.log(`Overall sleep performance: ${metrics.overallScore}%`);
```

### Personalized Analysis
```typescript
import { getEnhancedSleepMetrics, calculateSleepDebt } from '@/lib/health/sleep';

// Calculate current sleep debt
const sleepDebt = await calculateSleepDebt(8.0); // 8 hours target

// Get personalized metrics
const metrics = await getEnhancedSleepMetrics({
  baselineHours: 8.0,        // Personal baseline need
  strainHours: 0.5,          // Extra need from today's workout
  sleepDebtHours: sleepDebt, // Accumulated debt
  napHours: 0.5,             // Today's nap duration
});
```

### Component Integration
```typescript
import { EnhancedSleepMetrics } from '@/components/sleep/EnhancedSleepMetrics';

// Use in React component
<EnhancedSleepMetrics
  userPreferences={{
    baselineHours: 8.0,
    dailyStrainHours: 0.5,
    currentNapHours: 0.0,
  }}
/>
```

## Data Requirements

The system requires HealthKit permissions for:
- Sleep Analysis (`HKCategoryTypeIdentifier.sleepAnalysis`)
- Heart Rate (`HKQuantityTypeIdentifier.heartRate`)
- Heart Rate Variability (`HKQuantityTypeIdentifier.heartRateVariabilitySDNN`)
- Respiratory Rate (`HKQuantityTypeIdentifier.respiratoryRate`)

## Backward Compatibility

The enhanced system maintains full backward compatibility with existing code:
- `fetchSleepStats()` automatically uses enhanced metrics when available
- Falls back to basic calculations if physiological data is unavailable
- Existing components continue to work without modification

## Performance Considerations

- Sleep clusters are calculated efficiently using time-gap analysis
- Physiological data analysis includes error handling and fallbacks
- Results are cached appropriately for UI responsiveness

## Future Enhancements

Potential improvements include:
- Machine learning for personalized baseline adjustment
- Integration with workout intensity data for strain calculation
- Advanced sleep stage analysis using additional sensors
- Predictive sleep need modeling
