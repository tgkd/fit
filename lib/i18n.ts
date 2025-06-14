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
      settings: "Settings",
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

    // Sleep Screen (app/(tabs)/sleep.tsx)
    sleep: {
      chart: {
        total: "Total",
        deep: "Deep",
        rem: "REM",
        core: "Core",
        awake: "Awake",
      },
      total: "Total Sleep",
      deep: "Deep Sleep",
      rem: "REM Sleep",
      core: "Core Sleep",
      awakeTime: "Awake Time",
      sleepStagesDistribution: "Sleep Stages Distribution",
      unknownSource: "Unknown",
      today: "TODAY",
      performanceMessage:
        "You're doing great with an optimal Sleep Performance, but Hours vs. Needed could use attention.",
      learnMore: "LEARN MORE",
      lastNightsSleep: "Last Night's Sleep",
      todayVsPrior30Days: "Today vs. prior 30 days",
      hoursOfSleep: "HOURS OF SLEEP",
      typicalRange: "TYPICAL RANGE",
      duration: "DURATION",
      awake: "AWAKE",
      light: "LIGHT",
      restorativeSleep: "RESTORATIVE SLEEP",
      hoursVsNeeded: "HOURS VS. NEEDED",
      sleepConsistency: "SLEEP CONSISTENCY",
      sleepEfficiency: "SLEEP EFFICIENCY",
      highSleepStress: "HIGH SLEEP STRESS",
      sleepPerformance: "SLEEP PERFORMANCE",
      sleep: "SLEEP",
    },

    // Settings Screen (app/(tabs)/settings.tsx)
    settings: {
      title: "Settings",
      subtitle: "Configure your app preferences",
      healthDataTitle: "Health Data",
      healthDataSubtitle: "Manage your health data permissions in Health app",
    },

    // Workouts Screen (app/(tabs)/workouts.tsx)
    workouts: {
      title: "Workouts",
      subtitle: "Track and manage your workouts from HealthKit",
      thisMonth: "This Month",
      last7Days: "Last 7 Days",
      allTime: "All Time",
      workoutsCount: "Workouts",
      totalTime: "Total Time",
      calories: "Calories",
      totalWorkouts: "Total Workouts",
      avgCalories: "Avg Calories",
      noWorkoutData: "No workout data available from HealthKit. Start a workout on your Apple Watch or iPhone to see data here.",
      noWorkoutsLast7Days: "No workouts in the last 7 days",
      // Workout Details Screen
      quickStats: "Quick Stats",
      duration: "Duration",
      details: "Details",
      startTime: "Start Time",
      workoutType: "Workout Type",
      totalDuration: "Total Duration",
      caloriesBurned: "Calories Burned",
      additionalInfo: "Additional Info",
      workoutRecorded: "Workout recorded on",
      avgCaloriesPerMinute: "Avg calories per minute",
      heartRateRange: "Heart Rate Range",
      avgHeartRate: "Avg Heart Rate",
      distance: "Distance",
      pace: "Pace",
      m: "m",
      km: "km",
      bpm: "bpm",
      hours: "Hours",
      activeCal: "Active Cal",
      running: "Running",
      cycling: "Cycling",
      swimming: "Swimming",
      functionalStrengthTraining: "Functional Strength Training",
      yoga: "Yoga",
      soccer: "Soccer",
    },

    common: {
      back: "Back",
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

    // StressMonitorCard.tsx
    stressMonitor: {
      title: "STRESS MONITOR",
      lastUpdated: "Last updated {{time}}",
      loadingData: "Loading data...", // Added
      noData: "No data available.", // Added
      levels: {
        low: "LOW",
        medium: "MEDIUM",
        high: "HIGH",
        critical: "CRITICAL",
      },
    },
    // HRV Screen (app/hrv.tsx)
    hrvScreen: {
      enhancedStressAnalysis: "Enhanced Stress Analysis",
      basedOnPersonalBaselines: "Based on 14-day personal baselines",
      totalDay: "Total Day",
      sleep: "Sleep",
      daily: "Daily",
      baselines: "Baselines: HRV {{hrv}}ms • RHR {{rhr}}bpm",
      stressDataUnavailable:
        "Stress data unavailable. Using basic stress: {{stressLevel}}/100",
      requires14DaysData:
        "Requires 14 days of HRV and heart rate data for personal baselines.",
    },
  },
  ru: {
    tabs: {
      home: "Главная",
      stress: "Стресс",
      sleep: "Сон",
      activity: "Активность",
      healthData: "Здоровье",
    },
    // HomeScreen (app/(tabs)/index.tsx)
    home: {
      screenTitle: "Сегодняшняя панель",
      dailyStressTrends: "Ежедневные тенденции стресса",
      noStressData: "Данные о стрессе недоступны.",
      loadingHealthData: "Загрузка данных о здоровье...",
      strain: "Нагрузка",
      recovery: "Восстановление",
      sleep: "Сон",
      hrv: "ВСР",
      readiness: "Готовность",
      currentScore: "Текущий балл",
      avgLast7Days: "Среднее за 7 дней",
      lastNight: "Прошлая ночь",
      sleepHours: "{{hours}} ч",
      performance: "Производительность: {{performance}}",
      consistency: "Постоянство: {{consistency}}",
      heartRate: "Пульс",
      restingHeartRateValue: "{{value}} уд/мин",
      restingHeartRate: "В покое",
      activity: "Активность",
      stepsToday: "Шагов сегодня",
      caloriesBurned: "{{calories}} ккал сожжено",
      recoveryScore: "{{score}}",
      recoveryScoreLabel: "Балл восстановления",
      strainScore: "{{score}}",
      trainingStrain: "Тренировочная нагрузка",
      bloodOxygen: "Кислород в крови",
      bloodOxygenValue: "{{value}}%",
      spo2: "SpO2",
      stress: "Стресс",
      stressLevelValue: "{{value}}",
      stressLevel: "Текущий уровень",
      hrvValue: "{{value}} мс",
      hrvLabel: "ВСР",
      healthData: "Синхронизация данных о здоровье",
      healthDataSync:
        "Ваши данные о здоровье автоматически синхронизируются с вашего устройства или совместимых приложений Health Connect.",
    },

    // Sleep Screen (app/(tabs)/sleep.tsx)
    sleep: {
      chart: {
        total: "Всего",
        deep: "Глубокий",
        rem: "БДГ",
        core: "Основной",
        awake: "Бодрствование",
      },
      total: "Общий сон",
      deep: "Глубокий сон",
      rem: "БДГ-сон",
      core: "Основной сон",
      awakeTime: "Время бодрствования",
      sleepStagesDistribution: "Распределение фаз сна",
      unknownSource: "Неизвестно",
    },

    // Settings Screen (app/(tabs)/settings.tsx)
    settings: {
      title: "Настройки",
      subtitle: "Настройте параметры приложения",
      healthDataTitle: "Данные о здоровье",
      healthDataSubtitle:
        "Управляйте разрешениями для данных о здоровье в приложении Здоровье",
    },

    // StressChart.tsx
    stressChart: {
      title: "Уровни стресса",
      levelYAxis: "Уровень стресса",
      timeXAxis: "Время",
      legendLow: "Низкий",
      legendModerate: "Умеренный",
      legendMid: "Средний",
      legendHigh: "Высокий",
      legendMax: "Максимальный",
      legendVeryHigh: "Очень высокий",
      statsAvg: "Среднее:",
      statsMin: "Мин:",
      statsMax: "Макс:",
      statsCurrent: "Текущий:",
      stress: "Стресс",
      avg: "Среднее",
      peak: "Пик",
    },

    // HomeScreen (app/(tabs)/index.tsx)
    home: {
      screenTitle: "Сегодняшняя панель",
      dailyStressTrends: "Ежедневные тенденции стресса",
      noStressData: "Данные о стрессе недоступны.",
      loadingHealthData: "Загрузка данных о здоровье...",
      strain: "Нагрузка",
      recovery: "Восстановление",
      sleep: "Сон",
      hrv: "ВСР",
      readiness: "Готовность",
      currentScore: "Текущий балл",
      avgLast7Days: "Среднее за 7 дней",
      lastNight: "Прошлая ночь",
      sleepHours: "{{hours}} ч",
      performance: "Производительность: {{performance}}",
      consistency: "Постоянство: {{consistency}}",
      heartRate: "Пульс",
      restingHeartRateValue: "{{value}} уд/мин",
      restingHeartRate: "В покое",
      activity: "Активность",
      stepsToday: "Шагов сегодня",
      caloriesBurned: "{{calories}} ккал сожжено",
      recoveryScore: "{{score}}",
      recoveryScoreLabel: "Балл восстановления",
      strainScore: "{{score}}",
      trainingStrain: "Тренировочная нагрузка",
      bloodOxygen: "Кислород в крови",
      bloodOxygenValue: "{{value}}%",
      spo2: "SpO2",
      stress: "Стресс",
      stressLevelValue: "{{value}}",
      stressLevel: "Текущий уровень",
      hrvValue: "{{value}} мс",
      hrvLabel: "ВСР",
      healthData: "Синхронизация данных о здоровье",
      healthDataSync:
        "Ваши данные о здоровье автоматически синхронизируются с вашего устройства или совместимых приложений Health Connect.",
    },

    // Sleep Screen (app/(tabs)/sleep.tsx)
    sleep: {
      chart: {
        total: "Всего",
        deep: "Глубокий",
        rem: "БДГ",
        core: "Основной",
        awake: "Бодрствование",
      },
      total: "Общий сон",
      deep: "Глубокий сон",
      rem: "БДГ-сон",
      core: "Основной сон",
      awakeTime: "Время бодрствования",
      sleepStagesDistribution: "Распределение фаз сна",
      unknownSource: "Неизвестно",
    },

    // Settings Screen (app/(tabs)/settings.tsx)
    settings: {
      title: "Настройки",
      subtitle: "Настройте параметры приложения",
      healthDataTitle: "Данные о здоровье",
      healthDataSubtitle: "Управляйте разрешениями для данных о здоровье в приложении Здоровье",
    },

    // Workouts Screen (app/(tabs)/workouts.tsx)
    workouts: {
      title: "Тренировки",
      subtitle: "Отслеживайте и управляйте своими тренировками из HealthKit",
      thisMonth: "Этот месяц",
      last7Days: "Прошедшие 7 дней",
      allTime: "За все время",
      workoutsCount: "Тренировок",
      totalTime: "Общее время",
      calories: "Калории",
      totalWorkouts: "Всего тренировок",
      avgCalories: "ср. калорий",
      noWorkoutData: "Данных о тренировках нет в HealthKit. Начните тренировку на вашем Apple Watch или iPhone, чтобы увидеть данные здесь.",
      noWorkoutsLast7Days: "Тренировок не было за последние 7 дней",
      // Workout Details Screen
      quickStats: "Быстрая статистика",
      duration: "Продолжительность",
      details: "Детали",
      startTime: "Время начала",
      workoutType: "Тип тренировки",
      totalDuration: "Общая продолжительность",
      caloriesBurned: "Сожжено калорий",
      additionalInfo: "Дополнительная информация",
      workoutRecorded: "Тренировка записана",
      avgCaloriesPerMinute: "Среднее калорий в минуту",
      heartRateRange: "Диапазон пульса",
      avgHeartRate: "Средний пульс",
      distance: "Дистанция",
      pace: "Темп",
      m: "м",
      km: "км",
      bpm: "уд/мин",
      hours: "Часы",
      activeCal: "Активные калории",
      tennis: "Теннис",
      running: "Бег",
      cycling: "Велосипед",
      swimming: "Плавание",
      functionalStrengthTraining: "Функциональная сила",
      yoga: "Йога",
      soccer: "Футбол",
    },

    common: {
      back: "Назад",
    },

    // StressChart.tsx
    stressChart: {
      title: "Уровни стресса",
      levelYAxis: "Уровень стресса",
      timeXAxis: "Время",
      legendLow: "Низкий",
      legendModerate: "Умеренный",
      legendMid: "Средний",
      legendHigh: "Высокий",
      legendMax: "Максимальный",
      legendVeryHigh: "Очень высокий",
      statsAvg: "Среднее:",
      statsMin: "Мин:",
      statsMax: "Макс:",
      statsCurrent: "Текущий:",
      stress: "Стресс",
      avg: "Среднее",
      peak: "Пик",
    },

    // StressMonitorCard.tsx
    stressMonitor: {
      title: "МОНИТОР СТРЕССА",
      lastUpdated: "Обновлено {{time}}",
      loadingData: "Загрузка данных...", // Added
      noData: "Данные отсутствуют.", // Added
      levels: {
        low: "НИЗКИЙ",
        medium: "СРЕДНИЙ",
        high: "ВЫСОКИЙ",
        critical: "КРИТИЧЕСКИЙ",
      },
    },
    // HRV Screen (app/hrv.tsx)
    hrvScreen: {
      enhancedStressAnalysis: "Расширенный анализ стресса",
      basedOnPersonalBaselines: "На основе 14-дневных личных базовых показателей",
      totalDay: "Весь день",
      sleep: "Сон",
      daily: "Дневной",
      baselines: "Базовые показатели: ВСР {{hrv}}мс • ЧСС покоя {{rhr}}уд/мин",
      stressDataUnavailable:
        "Данные о стрессе недоступны. Используется базовый стресс: {{stressLevel}}/100",
      requires14DaysData:
        "Требуются данные о ВСР и частоте сердечных сокращений за 14 дней для определения личных базовых показателей.",
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

    // Workouts Screen (app/(tabs)/workouts.tsx)
    workouts: {
      title: "トレーニング",
      subtitle: "HealthKitからトレーニングを追跡および管理する",
      thisMonth: "この月",
      last7Days: "過去7日間",
      allTime: "全期間",
      workoutsCount: "トレーニング",
      totalTime: "総時間",
      calories: "カロリー",
      totalWorkouts: "総トレーニング",
      avgCalories: "平均カロリー",
      noWorkoutData: "HealthKitからのトレーニングデータがありません。Apple WatchまたはiPhoneでトレーニングを開始してここにデータを表示します。",
      noWorkoutsLast7Days: "過去7日間にトレーニングはありません",
      // Workout Details Screen
      quickStats: "クイック統計",
      duration: "継続時間",
      details: "詳細",
      startTime: "開始時間",
      workoutType: "トレーニングタイプ",
      totalDuration: "総継続時間",
      caloriesBurned: "消費カロリー",
      additionalInfo: "追加情報",
      workoutRecorded: "トレーニング記録日",
      avgCaloriesPerMinute: "1分あたりの平均カロリー",
    },

    common: {
      back: "戻る",
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

    // StressMonitorCard.tsx
    stressMonitor: {
      title: "ストレスモニター",
      lastUpdated: "最終更新 {{time}}",
      loadingData: "データを読み込み中...", // Added
      noData: "利用可能なデータがありません。", // Added
      levels: {
        low: "低い",
        medium: "中程度",
        high: "高い",
        critical: "危険",
      },
    },
    // HRV Screen (app/hrv.tsx)
    hrvScreen: {
      enhancedStressAnalysis: "強化されたストレス分析",
      basedOnPersonalBaselines: "14日間の個人的なベースラインに基づく",
      totalDay: "終日",
      sleep: "睡眠",
      daily: "毎日",
      baselines: "ベースライン: HRV {{hrv}}ms • RHR {{rhr}}bpm",
      stressDataUnavailable:
        "ストレスデータが利用できません。基本的なストレスを使用しています: {{stressLevel}}/100",
      requires14DaysData:
        "個人的なベースラインには14日間のHRVと心拍数データが必要です。",
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
