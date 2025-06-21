import { WorkoutActivityType } from "@kingstinct/react-native-healthkit";

export const getWorkoutTypeColor = (type: WorkoutActivityType) => {
  if (
    type === WorkoutActivityType.running ||
    type === WorkoutActivityType.cycling
  ) {
    return "#FF6B8A";
  } else if (type === WorkoutActivityType.functionalStrengthTraining) {
    return "#FFB347";
  } else if (type === WorkoutActivityType.yoga) {
    return "#98D8C8";
  } else if (type === WorkoutActivityType.swimming) {
    return "#87CEEB";
  } else if (type === WorkoutActivityType.tennis) {
    return "#b5e48c";
  } else if (type === WorkoutActivityType.soccer) {
    return "#B19CD9";
  } else {
    return "#C8A2C8";
  }
};

export const getWorkoutTypeIcon = (type: WorkoutActivityType) => {
  if (type === WorkoutActivityType.running) {
    return "🏃";
  } else if (type === WorkoutActivityType.cycling) {
    return "🚴";
  } else if (type === WorkoutActivityType.functionalStrengthTraining) {
    return "💪";
  } else if (type === WorkoutActivityType.yoga) {
    return "🧘";
  } else if (type === WorkoutActivityType.swimming) {
    return "🏊";
  } else if (type === WorkoutActivityType.tennis) {
    return "🎾";
  } else if (type === WorkoutActivityType.soccer) {
    return "⚽";
  } else {
    return "🏅";
  }
};
