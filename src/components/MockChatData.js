// MockChatData.js - Test data for different chat modes

export const mockChatData = {
  // Default mode - Quick help with profile form
  default: {
    conversations: [
      {
        id: 'profile-help',
        title: 'Profile Help',
        messages: [
          { id: 1, text: "Hi! I can help you with your profile. What do you need?", sender: 'ai' },
          { id: 2, text: "What's the recommended image size for profile pictures?", sender: 'user' },
          { id: 3, text: "For best results, use at least 98x98 pixels, up to 4MB. PNG or JPG work great!", sender: 'ai' },
          { id: 4, text: "Can I change my username later?", sender: 'user' },
          { id: 5, text: "Yes, you can change your handle twice every 14 days.", sender: 'ai' }
        ]
      }
    ],
    quickActions: ['Upload photo', 'Generate username', 'Phone format help']
  },

  // Panel mode - Multi-conversation support
  panel: {
    conversations: [
      {
        id: 'profile-optimization',
        title: 'Profile Optimization',
        messages: [
          { id: 1, text: "Let me help optimize your professional profile for better visibility.", sender: 'ai' },
          { id: 2, text: "Based on your industry (Technology), I suggest highlighting your technical skills in your display name.", sender: 'ai' },
          { id: 3, text: "Should I use my full name or a professional nickname?", sender: 'user' },
          { id: 4, text: "For Technology professionals, either works. Full names build trust, nicknames can be more memorable. What's your preference?", sender: 'ai' }
        ]
      },
      {
        id: 'company-research',
        title: 'Company Data',
        messages: [
          { id: 1, text: "I found information about companies similar to yours. Would you like industry benchmarks?", sender: 'ai' },
          { id: 2, text: "Yes, show me what other 1000+ employee tech companies typically list", sender: 'user' },
          { id: 3, text: "Here are common job titles at large tech companies:\n• VP of Engineering\n• Principal Software Engineer\n• Technical Product Manager\n• Director of Data Science", sender: 'ai' }
        ]
      }
    ],
    activeFilters: ['Profile tips', 'Industry data'],
    searchHistory: ['profile photo tips', 'tech company titles', 'linkedin optimization']
  },

  // Agent mode - Complex workflows
  agent: {
    conversations: [
      {
        id: 'profile-automation',
        title: 'Profile Auto-Fill',
        messages: [
          { id: 1, text: "I can help auto-populate your profile from your LinkedIn or resume. Which would you prefer?", sender: 'ai' },
          { id: 2, text: "LinkedIn would be great", sender: 'user' },
          { id: 3, text: "Perfect! I'll need to connect to LinkedIn. Here's what I can extract:\n\n📊 **Data Sources Available:**\n• Current job title and company\n• Profile photo\n• Professional summary\n• Work history\n• Skills and endorsements", sender: 'ai' }
        ]
      }
    ],
    workflows: [
      {
        id: 'linkedin-import',
        name: 'LinkedIn Profile Import',
        steps: [
          { id: 1, title: 'Connect LinkedIn', status: 'pending', description: 'Authorize access to your LinkedIn profile' },
          { id: 2, title: 'Extract Data', status: 'waiting', description: 'Pull relevant profile information' },
          { id: 3, title: 'Map Fields', status: 'waiting', description: 'Match LinkedIn data to profile fields' },
          { id: 4, title: 'Review & Confirm', status: 'waiting', description: 'Review extracted data before applying' }
        ]
      },
      {
        id: 'compliance-check',
        name: 'Profile Compliance Check',
        steps: [
          { id: 1, title: 'Check Photo Guidelines', status: 'completed', description: 'Verify image meets platform requirements' },
          { id: 2, title: 'Validate Contact Info', status: 'in-progress', description: 'Ensure email and phone are properly formatted' },
          { id: 3, title: 'Review Content Policy', status: 'waiting', description: 'Check display name and company info compliance' }
        ]
      }
    ],
    dataViews: {
      extractedProfile: {
        name: 'John Smith',
        title: 'Senior Software Engineer',
        company: 'Tech Corp',
        location: 'San Francisco, CA',
        photoUrl: 'https://linkedin.com/photo.jpg',
        confidence: 0.95
      }
    }
  },

  // Research mode - Comprehensive analysis
  research: {
    conversations: [
      {
        id: 'industry-analysis',
        title: 'Tech Industry Analysis',
        messages: [
          { id: 1, text: "Let me research optimal profile strategies for technology professionals in your company size range.", sender: 'ai' },
          { id: 2, text: "I've analyzed 50,000+ tech professional profiles. Here are key insights for 1000+ employee companies:", sender: 'ai' },
          { id: 3, text: "What specific aspects should I focus on?", sender: 'user' },
          { id: 4, text: "I'll create a comprehensive report covering:\n\n📈 **Profile Performance Metrics**\n• Engagement rates by photo type\n• Display name effectiveness\n• Company size correlation\n\n🎯 **Optimization Recommendations**\n• Industry-specific keywords\n• Professional photo guidelines\n• Contact visibility best practices\n\n📊 **Benchmarking Data**\n• Peer comparison analysis\n• Growth trajectory modeling", sender: 'ai' }
        ]
      }
    ],
    documents: [
      {
        id: 'profile-research-report',
        title: 'Professional Profile Optimization Report',
        type: 'PDF',
        pages: 24,
        lastModified: '2025-01-15',
        summary: 'Comprehensive analysis of 50K+ tech professional profiles with actionable recommendations'
      },
      {
        id: 'industry-benchmarks',
        title: 'Technology Sector Benchmarks 2025',
        type: 'Excel',
        sheets: 8,
        lastModified: '2025-01-10',
        summary: 'Statistical analysis of profile performance across company sizes and roles'
      }
    ],
    charts: [
      {
        id: 'engagement-by-photo',
        title: 'Profile Engagement by Photo Type',
        type: 'bar',
        data: [
          { category: 'Professional Headshot', engagement: 85 },
          { category: 'Casual Photo', engagement: 62 },
          { category: 'Company Logo', engagement: 34 },
          { category: 'No Photo', engagement: 23 }
        ]
      },
      {
        id: 'company-size-trends',
        title: 'Profile Completion by Company Size',
        type: 'line',
        data: [
          { size: '1-10', completion: 67 },
          { size: '11-50', completion: 74 },
          { size: '51-200', completion: 81 },
          { size: '201-1000', completion: 88 },
          { size: '1000+', completion: 93 }
        ]
      }
    ],
    searchTools: {
      globalSearch: true,
      filters: ['Document type', 'Date range', 'Relevance score'],
      savedSearches: ['tech profile optimization', 'company size analysis', 'photo best practices']
    }
  }
};

// Use case triggers based on form interactions
export const useCaseTriggers = {
  profilePicture: {
    defaultMode: "What's the best photo size?",
    panelMode: "Analyze my photo options",
    agentMode: "Auto-crop and optimize my photo",
    researchMode: "Research optimal professional photos"
  },

  displayName: {
    defaultMode: "How should I format my name?",
    panelMode: "Compare name variations",
    agentMode: "Generate professional name options",
    researchMode: "Analyze name impact on engagement"
  },

  username: {
    defaultMode: "Is this username available?",
    panelMode: "Suggest username alternatives",
    agentMode: "Auto-generate branded username",
    researchMode: "Username strategy analysis"
  },

  companyInfo: {
    defaultMode: "What industry should I select?",
    panelMode: "Research my company details",
    agentMode: "Auto-fill from LinkedIn/database",
    researchMode: "Industry benchmarking analysis"
  }
};

// Context-aware suggestions based on current form section
export const contextualSuggestions = {
  pictureSection: [
    "📸 Upload and auto-crop your photo",
    "🎨 Generate professional avatar",
    "📊 See photo performance data",
    "🔍 Research optimal photo styles"
  ],

  personalInfo: [
    "✨ Optimize your display name",
    "🏷️ Generate username options",
    "📋 Import from LinkedIn",
    "📈 View name effectiveness data"
  ],

  contactInfo: [
    "📞 Format phone number",
    "🔒 Check privacy settings",
    "✅ Verify contact details",
    "📊 Contact visibility analytics"
  ],

  companyInfo: [
    "🏢 Auto-fill company details",
    "📊 Get industry insights",
    "🎯 Role optimization tips",
    "📈 Company size benchmarks"
  ]
};