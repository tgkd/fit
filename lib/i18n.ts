import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";

// Set the key-value pairs for the different languages you want to support.
const translations = {
  en: {
    tabs: {
      home: "Home",
      stress: "Stress",
      sleep: "Sleep",
      activity: "Activity",
      healthData: "Health Data",
    },
    // HomeScreen (app/(tabs)/index.tsx)
    home: {
      screenTitle: "Today's Dashboard", // Was homeScreenTitle
      dailyStressTrends: "Daily Stress Trends",
      noStressData: "No stress data available.",
      loadingHealthData: "Loading health data...",
      strain: "Strain",
      recovery: "Recovery",
      sleep: "Sleep",
      hrv: "HRV",
      readiness: "Readiness",
      currentScore: "Current Score",
      avgLast7Days: "Avg. last 7 days",
      lastNight: "Last Night",
      sleepHours: "{{hours}} hrs", // for sleep duration, was hours
      performance: "Performance: {{performance}}",
      consistency: "Consistency: {{consistency}}",
      heartRate: "Heart Rate",
      restingHeartRateValue: "{{value}} bpm",
      restingHeartRate: "Resting",
      activity: "Activity",
      stepsToday: "Steps Today",
      caloriesBurned: "{{calories}} kcal burned",
      recoveryScore: "{{score}}",
      recoveryScoreLabel: "Recovery Score",
      strainScore: "{{score}}",
      trainingStrain: "Training Strain",
      bloodOxygen: "Blood Oxygen",
      bloodOxygenValue: "{{value}}%",
      spo2: "SpO2",
      stress: "Stress", // General term for stress, also used in metric card
      stressLevelValue: "{{value}}",
      stressLevel: "Current Level",
      hrvValue: "{{value}} ms",
      hrvLabel: "HRV",
      healthData: "Health Data Sync",
      healthDataSync:
        "Your health data is synced automatically from your device or Health Connect compatible apps.",
    },

    // StressChart.tsx
    stressChart: {
      // Added nesting
      title: "Stress Levels", // Was stressChartTitle
      levelYAxis: "Stress Level", // Was stressLevelYAxis
      timeXAxis: "Time",
      legendLow: "Low",
      legendModerate: "Moderate",
      legendMid: "Mid",
      legendHigh: "High",
      legendMax: "Max",
      legendVeryHigh: "Very High",
      statsAvg: "Avg:",
      statsMin: "Min:",
      statsMax: "Max:",
      statsCurrent: "Current:",
      stress: "Stress", // General term for stress
      avg: "Avg",
      peak: "Peak",
    },
  },
  ja: {
    // HomeScreen (app/(tabs)/index.tsx)
    home: {
      screenTitle: "今日のダッシュボード", // Was homeScreenTitle
      dailyStressTrends: "日次ストレス傾向",
      noStressData: "ストレスデータがありません。",
      loadingHealthData: "健康データを読み込み中...",
      strain: "負荷",
      recovery: "回復",
      sleep: "睡眠",
      hrv: "HRV", // Often kept as HRV or 心拍変動
      readiness: "準備状態",
      currentScore: "現在のスコア",
      avgLast7Days: "過去7日間の平均",
      lastNight: "昨晩",
      sleepHours: "{{hours}}時間", // for sleep duration, was hours
      performance: "パフォーマンス: {{performance}}",
      consistency: "一貫性: {{consistency}}",
      heartRate: "心拍数",
      restingHeartRateValue: "{{value}} bpm",
      restingHeartRate: "安静時",
      activity: "アクティビティ",
      stepsToday: "今日の歩数",
      caloriesBurned: "{{calories}} kcal 消費",
      recoveryScore: "{{score}}",
      recoveryScoreLabel: "回復スコア",
      strainScore: "{{score}}",
      trainingStrain: "トレーニング負荷",
      bloodOxygen: "血中酸素",
      bloodOxygenValue: "{{value}}%",
      spo2: "SpO2",
      stress: "ストレス", // General term for stress, also used in metric card
      stressLevelValue: "{{value}}",
      stressLevel: "現在のレベル",
      hrvValue: "{{value}} ms",
      hrvLabel: "HRV",
      healthData: "健康データの同期",
      healthDataSync:
        "健康データは、お使いのデバイスまたはHealth Connect対応アプリから自動的に同期されます。",
    },

    // StressChart.tsx
    stressChart: {
      // Added nesting
      title: "ストレスレベル", // Was stressChartTitle
      levelYAxis: "ストレスレベル", // Was stressLevelYAxis
      timeXAxis: "時間",
      legendLow: "低い",
      legendModerate: "中程度",
      legendHigh: "高い",
      legendVeryHigh: "非常に高い",
      statsAvg: "平均:",
      statsMin: "最小:",
      statsMax: "最大:",
      statsCurrent: "現在:",
      stress: "ストレス", // General term for stress
    },
  },
};

const i18n = new I18n(translations);

// Set the locale once at the beginning of your app.
const locales = getLocales();
i18n.locale = locales[0]?.languageCode ?? "en";

// When a value is missing from a language it'll fall back to English.
i18n.enableFallback = true;

export default i18n;
