# Strava API constants and shared configuration

# Strava API base URL
STRAVA_API_BASE = 'https://www.strava.com/api/v3'

# Common activity types
ACTIVITY_TYPES = {
    'RUN': 'Run',
    'RIDE': 'Ride',
    'SWIM': 'Swim',
    'HIKE': 'Hike',
    'WALK': 'Walk',
    'VIRTUAL_RIDE': 'VirtualRide',
    'WORKOUT': 'Workout'
}

# Default pagination settings
DEFAULT_PER_PAGE = 30
MAX_PER_PAGE = 200  # Strava's maximum

# Time zone configuration
DEFAULT_TIMEZONE = 'America/New_York'

# Unit conversion constants
METERS_TO_MILES = 1609.34
METERS_TO_FEET = 3.28084