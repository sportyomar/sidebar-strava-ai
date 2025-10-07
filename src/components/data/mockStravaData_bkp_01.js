export const mockStravaResponse = {
  answer: "Your average running pace this month is 8:15 per mile (5:08 per kilometer). This is calculated from 36 runs totaling 301,773.5 meters over the last 30 days, with a total moving time of 90,733 seconds.",

  audit: {
    data_sources: [{
      endpoint: "activities",
      params: {
        type: "Run",
        after: "2025-09-03",
        before: "2025-10-02",
        athlete_id: "omar_morrison"
      },
      activities_fetched: 36
    }],

    calculations: {
      method: "total_moving_time / total_distance",
      metric: "average_pace",
      raw_calculation: "90733 seconds / 301773.5 meters",
      conversion: "3.32 meters/second = 8:15/mile",
      time_period: "last_30_days",
      period_start: "2025-09-03",
      period_end: "2025-10-02",
      activities_included: 36,
      activities_excluded: 0
    },

    data_quality: {
      completeness: 1.0,
      last_synced: "2025-10-02T22:20:17Z"
    }
  },

  raw_data: {
    activity_count: 36,
    total_distance_meters: 301773.5,
    total_moving_time: 90733,
    total_elapsed_time: 91754
  },

  alternatives: [
    "Calculate using elapsed time instead of moving time (would result in 8:18/mile)",
    "Break down pace by week to show trends",
    "Calculate median pace instead of mean"
  ]
};

export const mockActivityList = {
  activities: [
    {
      id: 16015252230,
      name: "Evening Run",
      distance: 12886.5,
      moving_time: 3687,
      elapsed_time: 3700,
      average_speed: 3.495,
      average_heartrate: 140.8,
      start_date: "2025-10-02T18:30:00Z"
    },
    // Add more mock activities as needed
  ]
};

export const mockConnectionStatus = {
  connected: true,
  athlete: {
    id: 74877055,
    firstname: "Omar",
    lastname: "Morrison",
    username: "omar_morrison"
  },
  expires_at: "2025-10-03T19:44:42",
  token_expired: false
};