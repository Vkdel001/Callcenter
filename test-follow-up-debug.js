// Debug script for follow-up issues
// Run this in browser console to debug follow-up data

async function debugFollowUps() {
  console.log('🔍 Starting follow-up debug...')
  
  // Get current user
  const user = window.currentUser || JSON.parse(localStorage.getItem('user'))
  console.log('👤 Current user:', user)
  
  // Test date parsing
  const testDate = '16/12/2024'
  console.log('📅 Testing date parsing for:', testDate)
  
  // Method 1: Direct parsing
  const date1 = new Date(testDate)
  console.log('📅 Direct parsing:', date1, 'Valid:', !isNaN(date1.getTime()))
  
  // Method 2: Convert dd/mm/yyyy to yyyy-mm-dd
  const parts = testDate.split('/')
  const [day, month, year] = parts
  const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
  const date2 = new Date(isoDate)
  console.log('📅 ISO format parsing:', isoDate, '→', date2, 'Valid:', !isNaN(date2.getTime()))
  
  // Test API calls
  try {
    console.log('🔍 Testing API calls...')
    
    // Check if followUpService is available
    if (window.followUpService) {
      const result = await window.followUpService.getAgentFollowUps(user.id, user.agent_type, user.branch_id)
      console.log('📊 Follow-up service result:', result)
    } else {
      console.log('❌ followUpService not available on window')
    }
    
  } catch (error) {
    console.error('❌ API test failed:', error)
  }
}

// Make it available globally
window.debugFollowUps = debugFollowUps

console.log('🔧 Debug function loaded. Run debugFollowUps() to test.')