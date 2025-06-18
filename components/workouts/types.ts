import { WorkoutActivityType } from "@kingstinct/react-native-healthkit";

export interface WorkoutData {
  id: string;
  type: WorkoutActivityType;
  duration: number; // in minutes
  date: Date;
  calories: number;
}
