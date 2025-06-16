#!/usr/bin/env node

/**
 * Debug script to test the stress calculations with sample data
 * This simulates the real health data flow to analyze the calculations
 */

// Sample data based on the comments in the code
const sampleData = {
  heartStressStats: {
    "restingHeartRate": 59,
    "hrv7DayAvg": 41.666666666666664,
    "hrvMostRecent": 43,
    "hrvValues": [41, 41, 43],
    "recoveryScore": 52.9,
    "stressLevel": 36.6,
    "bloodOxygen": {
      "value": 0.93,
      "date": "2025-06-15T03:36:07.000Z"
    }
  },
  stressDetails: {
    "baselineHRV": 41.7,
    "baselineRHR": 60,
    "totalDayStress": 2.33,
    "sleepStress": 0,
    "nonActivityStress": 2.33,
    "hourlyStress": [
      {
        "hourStart": "2025-06-15T04:00:00.000Z",
        "stress": 2.85
      },
      {
        "hourStart": "2025-06-15T05:00:00.000Z",
        "stress": 1.45
      },
      {
        "hourStart": "2025-06-15T06:00:00.000Z",
        "stress": 2.85
      },
      {
        "hourStart": "2025-06-15T08:00:00.000Z",
        "stress": 1.52
      },
      {
        "hourStart": "2025-06-15T09:00:00.000Z",
        "stress": 3
      }
    ]
  },
  defaults: {
    "RESPIRATORY_RATE": 15,
    "RESTING_HEART_RATE": 60,
    "SLEEP_EFFICIENCY": 85,
    "DEFAULT_STRESS_LEVEL": 2,
    "HRV_BASELINE": 45
  }
};

// Constants from the code
const HRV_RANGE = { min: 20, max: 85 };
const RHR_RANGE = { min: 40, max: 100 };
const RESP_RATE_RANGE = { min: 8, max: 20 };

const RECOVERY_WEIGHTS = {
  HRV: 0.5,
  RHR: 0.25,
  RESP: 0.125,
  SLEEP: 0.125,
};

const STRESS_RATIO_BOUNDS = {
  low: 0.5,
  high: 3.0,
};

// Utility functions
const mean = (xs) => xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
const normalize = (v, min, max) => {
  if (max === min) return 100;
  const normalized = ((v - min) / (max - min)) * 100;
  return Math.max(0, Math.min(100, normalized));
};
const roundTo = (num, decimals) => parseFloat(num.toFixed(decimals));

// Analysis functions
function analyzeRecoveryScore() {
  console.log('\n🔬 RECOVERY SCORE ANALYSIS');
  console.log('==========================');

  const { heartStressStats, defaults } = sampleData;
  const { hrvValues, restingHeartRate } = heartStressStats;

  console.log('Input data:');
  console.log('- HRV values:', hrvValues);
  console.log('- Resting HR:', restingHeartRate);
  console.log('- Respiratory rate:', defaults.RESPIRATORY_RATE);
  console.log('- Sleep efficiency:', defaults.SLEEP_EFFICIENCY);

  // Calculate components
  const avgHRV = mean(hrvValues);
  console.log('\nCalculated average HRV:', avgHRV);

  // Check if we're using dynamic ranges (baseline values available)
  const baselineHrv = avgHRV; // hrv7DayAvg is used as baseline in fetchHeartStressStats
  const baselineRhr = restingHeartRate; // restingHeartRate is used as baseline

  console.log('\nBaseline values for dynamic ranges:');
  console.log('- Baseline HRV:', baselineHrv);
  console.log('- Baseline RHR:', baselineRhr);

  // Calculate dynamic ranges (as per code)
  const calculateDynamicHrvRange = (baseline) => ({
    min: Math.max(15, baseline * 0.5),
    max: baseline * 1.5,
  });

  const calculateDynamicRhrRange = (baseline) => ({
    min: Math.max(30, baseline * 0.7),
    max: baseline * 1.3,
  });

  // Use dynamic ranges since we have baseline values
  const hrvRange = calculateDynamicHrvRange(baselineHrv);
  const rhrRange = calculateDynamicRhrRange(baselineRhr);

  console.log('\nUsing DYNAMIC ranges:');
  console.log('- HRV range:', hrvRange, '(instead of static 20-85)');
  console.log('- RHR range:', rhrRange, '(instead of static 40-100)');

  // Normalize values using dynamic ranges
  const normHRV = normalize(avgHRV, hrvRange.min, hrvRange.max);
  const normRHR = 100 - normalize(restingHeartRate, rhrRange.min, rhrRange.max);
  const normResp = 100 - normalize(defaults.RESPIRATORY_RATE, RESP_RATE_RANGE.min, RESP_RATE_RANGE.max);
  const normSleep = Math.max(0, Math.min(100, defaults.SLEEP_EFFICIENCY));

  console.log('\nNormalized values with dynamic ranges:');
  console.log('- HRV normalized:', normHRV, '(higher is better)');
  console.log('- RHR normalized:', normRHR, '(lower HR = higher score)');
  console.log('- Resp normalized:', normResp, '(lower rate = higher score)');
  console.log('- Sleep normalized:', normSleep);

  // Calculate weighted score
  const contributions = {
    hrv: normHRV * RECOVERY_WEIGHTS.HRV,
    rhr: normRHR * RECOVERY_WEIGHTS.RHR,
    resp: normResp * RECOVERY_WEIGHTS.RESP,
    sleep: normSleep * RECOVERY_WEIGHTS.SLEEP
  };

  console.log('\nWeighted contributions:');
  console.log('- HRV contribution:', contributions.hrv, `(${normHRV} × ${RECOVERY_WEIGHTS.HRV})`);
  console.log('- RHR contribution:', contributions.rhr, `(${normRHR} × ${RECOVERY_WEIGHTS.RHR})`);
  console.log('- Resp contribution:', contributions.resp, `(${normResp} × ${RECOVERY_WEIGHTS.RESP})`);
  console.log('- Sleep contribution:', contributions.sleep, `(${normSleep} × ${RECOVERY_WEIGHTS.SLEEP})`);

  const totalScore = Object.values(contributions).reduce((a, b) => a + b, 0);
  const finalScore = roundTo(totalScore, 1);

  console.log('\nTotal recovery score:', totalScore);
  console.log('Final recovery score:', finalScore);
  console.log('Expected score:', heartStressStats.recoveryScore);
  console.log('Match:', Math.abs(finalScore - heartStressStats.recoveryScore) < 0.1 ? '✅' : '❌');

  // Also show what static ranges would give
  console.log('\n📊 Comparison with static ranges:');
  const staticNormHRV = normalize(avgHRV, HRV_RANGE.min, HRV_RANGE.max);
  const staticNormRHR = 100 - normalize(restingHeartRate, RHR_RANGE.min, RHR_RANGE.max);
  const staticScore = staticNormHRV * RECOVERY_WEIGHTS.HRV +
                     staticNormRHR * RECOVERY_WEIGHTS.RHR +
                     normResp * RECOVERY_WEIGHTS.RESP +
                     normSleep * RECOVERY_WEIGHTS.SLEEP;
  console.log('- Static ranges score:', roundTo(staticScore, 1));
  console.log('- Dynamic ranges score:', finalScore);
  console.log('- Difference:', roundTo(finalScore - staticScore, 1));
}

function analyzeStressLevel() {
  console.log('\n🔬 STRESS LEVEL ANALYSIS');
  console.log('========================');

  const { heartStressStats } = sampleData;
  const { restingHeartRate, hrv7DayAvg } = heartStressStats;

  console.log('Input data:');
  console.log('- Resting HR:', restingHeartRate);
  console.log('- HRV (7-day avg):', hrv7DayAvg);

  if (!restingHeartRate || !hrv7DayAvg || hrv7DayAvg === 0) {
    console.log('❌ Missing data for stress calculation');
    return;
  }

  const ratio = restingHeartRate / hrv7DayAvg;
  console.log('\nRHR/HRV ratio:', ratio);
  console.log('Stress ratio bounds:', STRESS_RATIO_BOUNDS);

  const stressScore = ((ratio - STRESS_RATIO_BOUNDS.low) / (STRESS_RATIO_BOUNDS.high - STRESS_RATIO_BOUNDS.low)) * 100;

  console.log('\nStress score calculation:');
  console.log('- Numerator:', ratio - STRESS_RATIO_BOUNDS.low);
  console.log('- Denominator:', STRESS_RATIO_BOUNDS.high - STRESS_RATIO_BOUNDS.low);
  console.log('- Raw score:', stressScore);

  const finalStressLevel = Math.max(0, Math.min(100, roundTo(stressScore, 1)));
  console.log('Final stress level:', finalStressLevel);
  console.log('Expected stress level:', heartStressStats.stressLevel);
  console.log('Match:', Math.abs(finalStressLevel - heartStressStats.stressLevel) < 0.1 ? '✅' : '❌');
}

function analyzeHourlyStress() {
  console.log('\n🔬 HOURLY STRESS ANALYSIS');
  console.log('=========================');

  const { stressDetails } = sampleData;
  const { baselineHRV, baselineRHR, hourlyStress } = stressDetails;

  console.log('Baseline values:');
  console.log('- Baseline HRV:', baselineHRV);
  console.log('- Baseline RHR:', baselineRHR);

  console.log('\nHourly stress breakdown:');
  hourlyStress.forEach(h => {
    const hour = new Date(h.hourStart).getHours();
    console.log(`- ${hour}:00 → Stress: ${h.stress}`);
  });

  const allStressValues = hourlyStress.map(h => h.stress);
  const avgStress = mean(allStressValues);

  console.log('\nAggregated metrics:');
  console.log('- All stress values:', allStressValues);
  console.log('- Average stress:', avgStress);
  console.log('- Expected total day stress:', stressDetails.totalDayStress);
  console.log('- Match:', Math.abs(avgStress - stressDetails.totalDayStress) < 0.01 ? '✅' : '❌');
}

function analyzeStressMomentCalculation() {
  console.log('\n🔬 STRESS MOMENT CALCULATION ANALYSIS');
  console.log('====================================');

  // Let's simulate a specific moment
  const currentHR = 110;  // elevated HR
  const currentHRV = 30;  // lower HRV
  const baselineRHR = 60;
  const baselineHRV = 42;
  const hourOfDay = 8;

  console.log('Sample stress moment calculation:');
  console.log('- Current HR:', currentHR);
  console.log('- Current HRV:', currentHRV);
  console.log('- Baseline RHR:', baselineRHR);
  console.log('- Baseline HRV:', baselineHRV);
  console.log('- Hour of day:', hourOfDay);

  // HRV stress: how far below baseline
  const hrvStress = baselineHRV > 0 ? Math.max(0, 1 - currentHRV / baselineHRV) : 0;

  // HR stress: how far above resting HR
  const hrDelta = currentHR - baselineRHR;
  const hrStress = baselineRHR > 0 ? Math.max(0, Math.min(1, hrDelta / (baselineRHR * 0.5))) : 0;

  console.log('\nStress components:');
  console.log('- HRV stress:', hrvStress, `(1 - ${currentHRV}/${baselineHRV})`);
  console.log('- HR delta:', hrDelta);
  console.log('- HR stress:', hrStress, `(${hrDelta} / (${baselineRHR} * 0.5))`);

  // Average and scale to 0-3
  let rawStress = ((hrvStress + hrStress) / 2) * 3;
  console.log('- Raw stress (0-3 scale):', rawStress);

  // Time-of-day adjustment (simplified)
  let adjustmentFactor = 1.0;
  if (hourOfDay >= 6 && hourOfDay < 9) {
    adjustmentFactor = 0.95;  // Morning adjustment
  }

  const adjustedStress = rawStress * adjustmentFactor;
  const finalStress = parseFloat(Math.max(0, Math.min(3, adjustedStress)).toFixed(2));

  console.log('- Time adjustment factor:', adjustmentFactor);
  console.log('- Adjusted stress:', adjustedStress);
  console.log('- Final stress moment:', finalStress);
}

function identifyPotentialIssues() {
  console.log('\n🚨 POTENTIAL ISSUES IDENTIFIED');
  console.log('=============================');

  const { heartStressStats, stressDetails } = sampleData;

  // Check HRV values
  if (heartStressStats.hrvValues.length < 3) {
    console.log('⚠️  Low HRV sample count:', heartStressStats.hrvValues.length);
  }

  // Check baseline vs current values
  const currentHRV = heartStressStats.hrv7DayAvg;
  const baselineHRV = stressDetails.baselineHRV;
  const hrvDiff = Math.abs(currentHRV - baselineHRV);

  if (hrvDiff > 5) {
    console.log('⚠️  Significant HRV baseline difference:', hrvDiff.toFixed(1), 'ms');
    console.log('   Current 7-day avg:', currentHRV);
    console.log('   14-day baseline:', baselineHRV);
  }

  // Check stress level consistency
  const stressRatio = heartStressStats.restingHeartRate / heartStressStats.hrv7DayAvg;
  const expectedStressFromRatio = ((stressRatio - 0.5) / (3.0 - 0.5)) * 100;
  const actualStress = heartStressStats.stressLevel;

  if (Math.abs(expectedStressFromRatio - actualStress) > 5) {
    console.log('⚠️  Stress level calculation inconsistency:');
    console.log('   Expected from ratio:', expectedStressFromRatio.toFixed(1));
    console.log('   Actual stress level:', actualStress);
  }

  // Check hourly stress distribution
  const hourlyValues = stressDetails.hourlyStress.map(h => h.stress);
  const maxHourlyStress = Math.max(...hourlyValues);
  const minHourlyStress = Math.min(...hourlyValues);

  if (maxHourlyStress > 2.5) {
    console.log('⚠️  Very high hourly stress detected:', maxHourlyStress);
  }

  if (maxHourlyStress - minHourlyStress > 2) {
    console.log('⚠️  High stress variability throughout day:', (maxHourlyStress - minHourlyStress).toFixed(2));
  }

  console.log('\n✅ Analysis complete!');
}

// Run all analyses
console.log('🔍 STRESS CALCULATION DEBUG ANALYSIS');
console.log('====================================');

analyzeRecoveryScore();
analyzeStressLevel();
analyzeHourlyStress();
analyzeStressMomentCalculation();
identifyPotentialIssues();

console.log('\n📋 SUMMARY');
console.log('==========');
console.log('This analysis helps identify issues in the stress calculation pipeline:');
console.log('1. Recovery score combines HRV, RHR, respiratory rate, and sleep efficiency');
console.log('2. Overall stress level uses RHR/HRV ratio mapped to 0-100 scale');
console.log('3. Hourly stress uses baseline comparison with time-of-day adjustments');
console.log('4. Check for data quality, baseline consistency, and calculation accuracy');
