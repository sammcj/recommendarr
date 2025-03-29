// OAuth setup module
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const authService = require('./auth');

// Configure Passport authentication
exports.setupPassport = (app) => {
  console.log('Setting up OAuth authentication strategies...');
  
  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure serialization/deserialization
  passport.serializeUser((user, done) => {
    console.log(`Serializing user: ${user.username} (${user.userId})`);
    done(null, user.userId);
  });
  
  passport.deserializeUser(async (userId, done) => {
    try {
      const user = await authService.getUserById(userId);
      if (!user) {
        console.log(`User not found for ID: ${userId}`);
        return done(null, false);
      }
      console.log(`Deserialized user: ${user.username}`);
      done(null, user);
    } catch (error) {
      console.error('Error deserializing user:', error);
      done(error, null);
    }
  });
  
  // Set up Google OAuth if credentials exist
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log('Setting up Google OAuth strategy...');
    
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: '/api/auth/google/callback',
      scope: ['profile', 'email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('Google OAuth callback received');
        const user = await authService.findOrCreateOAuthUser(profile, 'google');
        return done(null, user);
      } catch (error) {
        console.error('Error in Google OAuth callback:', error);
        return done(error, null);
      }
    }));
    
    console.log('Google OAuth strategy configured successfully');
  } else {
    console.log('Google OAuth not configured - missing environment variables');
  }
  
  // Set up GitHub OAuth if credentials exist
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    console.log('Setting up GitHub OAuth strategy...');
    
    passport.use(new GitHubStrategy({
      clientID: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackURL: '/api/auth/github/callback',
      scope: ['user:email']
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('GitHub OAuth callback received');
        const user = await authService.findOrCreateOAuthUser(profile, 'github');
        return done(null, user);
      } catch (error) {
        console.error('Error in GitHub OAuth callback:', error);
        return done(error, null);
      }
    }));
    
    console.log('GitHub OAuth strategy configured successfully');
  } else {
    console.log('GitHub OAuth not configured - missing environment variables');
  }
  
  // Function to validate if OAuth providers are configured
  const getEnabledProviders = () => {
    const providers = [];
    
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
      providers.push('google');
    }
    
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
      providers.push('github');
    }
    
    return providers;
  };
  
  return {
    passport,
    getEnabledProviders
  };
};