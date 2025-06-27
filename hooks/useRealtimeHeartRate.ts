import { useCallback, useEffect, useState } from "react";
import {
  subscribeToChanges,
  queryQuantitySamples,
  unsubscribeQueries,
  isHealthDataAvailableAsync,
  authorizationStatusFor,
  requestAuthorization,
  enableBackgroundDelivery,
  type QuantitySample,
  UpdateFrequency,
} from "@kingstinct/react-native-healthkit";
import { readPermissions } from "@/lib/health/permissions";
import { subHours, isAfter } from "date-fns";

export interface HeartRateDataPoint {
  value: number;
  timestamp: Date;
}

export function useRealtimeHeartRate() {
  const [dataPoints, setDataPoints] = useState<HeartRateDataPoint[]>([]);
  const [currentHeartRate, setCurrentHeartRate] = useState<number | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHealthKitAvailable, setIsHealthKitAvailable] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [, setSubscriptionId] = useState<string | null>(null);

  const fetchRecentHeartRateData = useCallback(async () => {
    // Throttle updates to maximum once per second for performance
    const nowTimestamp = Date.now();
    if (nowTimestamp - lastUpdateTime < 1000) {
      return;
    }
    setLastUpdateTime(nowTimestamp);
    
    try {
      const allSamples = await queryQuantitySamples("HKQuantityTypeIdentifierHeartRate", {
        limit: 500,
      });

      // Filter samples from the last hour using date-fns
      const oneHourAgo = subHours(new Date(), 1);
      const lastHourSamples = allSamples.filter(sample => 
        isAfter(new Date(sample.startDate), oneHourAgo)
      );
      
      let dataPointsToUse: HeartRateDataPoint[] = [];
      let latestHR: number | null = null;
      
      if (lastHourSamples.length > 0) {
        // Use last hour data
        dataPointsToUse = lastHourSamples
          .map((sample: QuantitySample) => ({
            value: sample.quantity,
            timestamp: new Date(sample.startDate),
          }))
          .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        latestHR = dataPointsToUse[dataPointsToUse.length - 1].value;
      } else if (allSamples.length > 0) {
        // Fallback to most recent single point from all samples
        const recentPoint = {
          value: allSamples[0].quantity,
          timestamp: new Date(allSamples[0].startDate),
        };
        
        dataPointsToUse = [recentPoint];
        latestHR = recentPoint.value;
      }
      
      if (latestHR !== null) {
        setDataPoints(dataPointsToUse);
        setCurrentHeartRate(latestHR);
        setError(null);
      } else {
        setDataPoints([]);
        setCurrentHeartRate(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch heart rate data");
    }
  }, [lastUpdateTime]);

  const checkHealthKitAvailability = useCallback(async () => {
    try {
      const available = await isHealthDataAvailableAsync();
      setIsHealthKitAvailable(available);
      
      if (available) {
        await requestAuthorization([], readPermissions);
        
        const authStatus = await authorizationStatusFor("HKQuantityTypeIdentifierHeartRate");
        const hasAuth = authStatus === 1;
        setHasPermission(hasAuth);
        
        if (authStatus === 2) {
          // Sometimes iOS shows denied but data is still accessible - test it
          try {
            const testSamples = await queryQuantitySamples("HKQuantityTypeIdentifierHeartRate", { limit: 1 });
            if (testSamples.length > 0) {
              setHasPermission(true); // Override if data is accessible
            }
          } catch {
            // Test failed, keep original permission status
          }
        }
      }
      
      return available;
    } catch {
      setError("Failed to check HealthKit availability");
      return false;
    }
  }, []);

  const startMonitoring = useCallback(async () => {
    setError(null);
    
    const available = await checkHealthKitAvailability();
    if (!available) {
      setError("HealthKit is not available on this device");
      return;
    }
    
    if (!hasPermission) {
      setError("Heart rate access denied. Please open iOS Health app → Sharing → [Your App] → Enable Heart Rate");
      return;
    }
    
    try {
      await enableBackgroundDelivery("HKQuantityTypeIdentifierHeartRate", UpdateFrequency.immediate);
    } catch {
      // Continue anyway - foreground monitoring should still work
    }
    
    setIsMonitoring(true);
  }, [checkHealthKitAvailability, hasPermission]);

  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  const clearData = useCallback(() => {
    setDataPoints([]);
    setCurrentHeartRate(null);
    setError(null);
  }, []);

  useEffect(() => {
    let currentSubscriptionId: string | null = null;
    
    if (isMonitoring) {
      fetchRecentHeartRateData();

      currentSubscriptionId = subscribeToChanges(
        "HKQuantityTypeIdentifierHeartRate",
        (args) => {
          if (args.errorMessage) {
            setError(args.errorMessage);
            return;
          }
          
          fetchRecentHeartRateData();
        }
      );
      
      setSubscriptionId(currentSubscriptionId);
    } else {
      setSubscriptionId(null);
    }

    return () => {
      if (currentSubscriptionId) {
        unsubscribeQueries([currentSubscriptionId]);
      }
    };
  }, [isMonitoring, fetchRecentHeartRateData]);

  // Check HealthKit availability on mount
  useEffect(() => {
    checkHealthKitAvailability();
  }, [checkHealthKitAvailability]);

  return {
    dataPoints,
    currentHeartRate,
    isMonitoring,
    error,
    isHealthKitAvailable,
    hasPermission,
    startMonitoring,
    stopMonitoring,
    clearData,
    refreshPermissions: checkHealthKitAvailability, // Add manual refresh
  };
}

// Heart rate zone utilities
export function calculateHeartRateZones(age: number) {
  const maxHR = 220 - age;
  
  return {
    zone1: [Math.round(maxHR * 0.5), Math.round(maxHR * 0.6)],
    zone2: [Math.round(maxHR * 0.6), Math.round(maxHR * 0.7)],
    zone3: [Math.round(maxHR * 0.7), Math.round(maxHR * 0.8)],
    zone4: [Math.round(maxHR * 0.8), Math.round(maxHR * 0.9)],
    zone5: [Math.round(maxHR * 0.9), Math.round(maxHR * 1.0)],
  };
}

export function getHeartRateZone(heartRate: number, age: number) {
  const zones = calculateHeartRateZones(age);
  
  if (heartRate >= zones.zone5[0]) {
    return { zone: 5, name: "Anaerobic", color: "#ff4444" };
  } else if (heartRate >= zones.zone4[0]) {
    return { zone: 4, name: "Threshold", color: "#ff8800" };
  } else if (heartRate >= zones.zone3[0]) {
    return { zone: 3, name: "Aerobic", color: "#ffdd00" };
  } else if (heartRate >= zones.zone2[0]) {
    return { zone: 2, name: "Base", color: "#88ff00" };
  } else if (heartRate >= zones.zone1[0]) {
    return { zone: 1, name: "Recovery", color: "#00ff88" };
  } else {
    return { zone: 0, name: "Resting", color: "#cccccc" };
  }
}