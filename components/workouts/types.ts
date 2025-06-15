import { HKWorkoutActivityType } from "@kingstinct/react-native-healthkit";

export interface WorkoutData {
  id: string;
  type: HKWorkoutActivityType;
  duration: number; // in minutes
  date: Date;
  calories: number;
}