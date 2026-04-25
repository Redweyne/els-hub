/**
 * Centralized copy management for consistent messaging across the app
 * This enables easy updates to user-facing text and maintains voice/tone consistency
 */

export const copy = {
  // Authentication
  auth: {
    login: {
      title: "Enter the Arena",
      description: "Log in to track ELYSIUM's performance",
      usernameLabel: "Username",
      passwordLabel: "Password",
      submitButton: "Log In",
      noAccount: "Don't have an account?",
      signupLink: "Sign up here",
      forgotPassword: "Forgot password?",
      errorInvalidCredentials: "Invalid username or password",
      errorNetworkError: "Failed to log in. Check your connection.",
    },
    signup: {
      title: "Join the Tracker",
      description: "Create your account to track performance",
      step1Title: "Verify Your Account",
      step2Title: "Create Your Credentials",
      uploadLabel: "Upload Your Account Screenshot",
      uploadHint: "PNG, JPG up to 10MB",
      usernameLabel: "Username",
      usernameHint: "Auto-filled from your in-game name (spaces removed). Edit if needed.",
      usernameError: "Username must be at least 3 characters",
      passwordLabel: "Password",
      passwordHint: "Create a strong password",
      passwordError: "Password must be at least 8 characters",
      emailLabel: "Email (read-only)",
      emailHint: "ELS members use @els.com",
      submitButton: "Create Account",
      successTitle: "Account Created",
      successDescription: "Your account is in preview mode. Redweyne will contact you directly in-game to verify your identity and finalize your account.",
      successCTA: "Go to Dashboard",
    },
    logout: "Log out",
  },

  // Dashboard
  dashboard: {
    factionHero: {
      tier: "Class S",
      status: "🔴 Active",
    },
    activeEvent: {
      title: "Active Event",
      noEventTitle: "No Active Event",
      noEventDescription: "There are no events currently in progress. Check back soon!",
      topPerformersLabel: "top performers",
      viewResults: "View Results",
    },
    topPerformers: {
      title: "Top Performers",
      noDataTitle: "No Event Data",
      noDataDescription: "Complete an event to see top performers.",
    },
    yourPerformance: {
      title: "Your Performance",
      noParticipationTitle: "No Participation Yet",
      noParticipationDescription: "Join an event to see your performance history here.",
      latestEventLabel: "Latest Event",
      rankLabel: "Rank",
      pointsLabel: "Points",
    },
    eventHistory: {
      title: "Event History",
      noEventsTitle: "No Events Yet",
      noEventsDescription: "Events will appear here as they are published.",
      trendlineLabel: "Points Trendline",
      pointsLabel: "pts",
    },
    stats: {
      membersLabel: "Members",
      influenceLabel: "Influence",
      statusLabel: "Status",
    },
  },

  // Forms and Validation
  validation: {
    required: "This field is required",
    minLength: (min: number) => `Must be at least ${min} characters`,
    maxLength: (max: number) => `Must be no more than ${max} characters`,
    invalidEmail: "Please enter a valid email address",
    invalidUsername: "Username can only contain letters, numbers, and underscores",
    passwordMismatch: "Passwords do not match",
  },

  // Errors and Messages
  errors: {
    networkError: "Network error. Please check your connection and try again.",
    offlineError: "You're offline. Please check your internet connection.",
    serverError: "Server error. Please try again later.",
    tryAgain: "Try Again",
    loadingError: "Failed to load data",
    submitError: "Failed to submit. Please try again.",
  },

  // UI Actions
  actions: {
    cancel: "Cancel",
    confirm: "Confirm",
    delete: "Delete",
    edit: "Edit",
    save: "Save",
    back: "Back",
    continue: "Continue",
    close: "Close",
    next: "Next",
    previous: "Previous",
    retry: "Retry",
    refresh: "Refresh",
    search: "Search",
    filter: "Filter",
  },

  // Modals and Dialogs
  modals: {
    deleteConfirmTitle: "Delete This?",
    deleteConfirmDescription: "This action cannot be undone.",
    successTitle: "Success",
    errorTitle: "Error",
  },

  // Navigation
  nav: {
    home: "Home",
    tracking: "Tracking",
    members: "Members",
    events: "Events",
    social: "Social",
    admin: "Admin",
  },

  // Member-related
  members: {
    roster: "Faction Roster",
    claimProfile: "Claim this profile",
    editProfile: "Edit profile",
    noMembers: "No members found",
  },

  // Event-related
  events: {
    factionCallUp: "Faction Call-Up",
    gloryOfOakvale: "Glory of Oakvale",
    createEvent: "Create Event",
    uploadScreenshots: "Upload Screenshots",
    reviewQueue: "Review Queue",
    eventProcessing: "Processing...",
    eventPublished: "Published",
    eventDraft: "Draft",
  },
} as const
