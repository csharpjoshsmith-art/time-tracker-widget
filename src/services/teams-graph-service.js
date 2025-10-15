const { Client } = require('@microsoft/microsoft-graph-client');
const { ConfidentialClientApplication } = require('@azure/msal-node');

class TeamsGraphService {
  constructor() {
    this.client = null;
    this.msalClient = null;
  }

  /**
   * Initialize the Graph client with an access token
   */
  initializeClient(accessToken) {
    this.client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      }
    });
  }

  /**
   * Get the MSAL authentication client
   * User needs to register an Azure AD app and provide credentials
   */
  getMsalClient(config) {
    if (!this.msalClient) {
      this.msalClient = new ConfidentialClientApplication({
        auth: {
          clientId: config.clientId,
          authority: `https://login.microsoftonline.com/${config.tenantId}`,
          clientSecret: config.clientSecret
        }
      });
    }
    return this.msalClient;
  }

  /**
   * Authenticate and get access token
   * This uses device code flow which is suitable for desktop apps
   */
  async authenticateDeviceCode(config) {
    const msalClient = this.getMsalClient(config);

    const deviceCodeRequest = {
      deviceCodeCallback: (response) => {
        console.log('\n=== Teams Authentication ===');
        console.log(response.message);
        console.log('============================\n');
        return response;
      },
      scopes: ['Calendars.Read', 'OnlineMeetings.Read', 'User.Read']
    };

    try {
      const response = await msalClient.acquireTokenByDeviceCode(deviceCodeRequest);
      return response.accessToken;
    } catch (error) {
      console.error('Authentication error:', error);
      throw error;
    }
  }

  /**
   * Get calendar events for today
   */
  async getTodaysMeetings(accessToken) {
    this.initializeClient(accessToken);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      const events = await this.client
        .api('/me/calendar/events')
        .filter(`start/dateTime ge '${today.toISOString()}' and start/dateTime lt '${tomorrow.toISOString()}'`)
        .select('subject,start,end,attendees,onlineMeeting,isOnlineMeeting')
        .orderby('start/dateTime')
        .get();

      return events.value;
    } catch (error) {
      console.error('Error fetching meetings:', error);
      throw error;
    }
  }

  /**
   * Get meetings happening right now
   */
  async getCurrentMeetings(accessToken) {
    this.initializeClient(accessToken);

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    try {
      const events = await this.client
        .api('/me/calendar/calendarView')
        .query({
          startDateTime: oneHourAgo.toISOString(),
          endDateTime: oneHourFromNow.toISOString()
        })
        .select('subject,start,end,attendees,onlineMeeting,isOnlineMeeting,organizer')
        .orderby('start/dateTime')
        .get();

      // Filter to only meetings happening now
      const currentMeetings = events.value.filter(event => {
        const start = new Date(event.start.dateTime);
        const end = new Date(event.end.dateTime);
        return start <= now && end >= now;
      });

      return currentMeetings;
    } catch (error) {
      console.error('Error fetching current meetings:', error);
      throw error;
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(accessToken) {
    this.initializeClient(accessToken);

    try {
      const user = await this.client.api('/me').get();
      return user;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Test the connection
   */
  async testConnection(accessToken) {
    try {
      const user = await this.getUserProfile(accessToken);
      return {
        success: true,
        user: {
          name: user.displayName,
          email: user.mail || user.userPrincipalName
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Format meeting for display
   */
  formatMeeting(meeting) {
    const attendees = meeting.attendees
      ?.filter(a => a.type !== 'resource') // Exclude conference rooms
      ?.map(a => a.emailAddress.name)
      .join(', ');

    return {
      title: meeting.subject,
      participants: attendees || 'No attendees',
      start: new Date(meeting.start.dateTime),
      end: new Date(meeting.end.dateTime),
      isOnline: meeting.isOnlineMeeting,
      organizer: meeting.organizer?.emailAddress?.name
    };
  }
}

module.exports = new TeamsGraphService();
