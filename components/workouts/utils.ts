import { HKWorkoutActivityType } from "@kingstinct/react-native-healthkit";

import { formatDateForWorkout, formatDuration } from "@/lib/formatters";

// Re-export formatters for backward compatibility
export { formatDateForWorkout, formatDuration };

export const getWorkoutTypeColor = (type: HKWorkoutActivityType) => {
  if (type == HKWorkoutActivityType.running || type == HKWorkoutActivityType.cycling) {
    return "#FF6B8A";
  } else if (type == HKWorkoutActivityType.functionalStrengthTraining) {
    return "#FFB347";
  } else if (type == HKWorkoutActivityType.yoga) {
    return "#98D8C8";
  } else if (type == HKWorkoutActivityType.swimming) {
    return "#87CEEB";
  } else if (type == HKWorkoutActivityType.tennis) {
    return "#b5e48c";
  } else if (type == HKWorkoutActivityType.soccer) {
    return "#B19CD9";
  } else {
    return "#C8A2C8";
  }
};

export const getWorkoutTypeIcon = (type: HKWorkoutActivityType) => {
  if (type == HKWorkoutActivityType.running) {
    return "🏃";
  } else if (type == HKWorkoutActivityType.cycling) {
    return "🚴";
  } else if (type == HKWorkoutActivityType.functionalStrengthTraining) {
    return "💪";
  } else if (type == HKWorkoutActivityType.yoga) {
    return "🧘";
  } else if (type == HKWorkoutActivityType.swimming) {
    return "🏊";
  } else if (type == HKWorkoutActivityType.tennis) {
    return "🎾";
  } else if (type == HKWorkoutActivityType.soccer) {
    return "⚽";
  } else {
    return "🏅";
  }
};